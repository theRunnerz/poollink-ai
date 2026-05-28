export interface ParsedStatus {
  status: 'open' | 'closed' | 'unknown' | 'maintenance' | 'limited';
  displayText: string;
  activities: { type: string, label: string, time: string, isActive?: boolean }[];
  confidence: 'High' | 'Medium' | 'Low';
}

const normalizeActivityType = (label: string): string => {
  const l = label.toLowerCase();
  if (l.includes('lane') || l.includes('lap') || l.includes('lengths') || l.includes('fitness swim')) return 'lane_swim';
  if (l.includes('public') || l.includes('rec') || l.includes('open swim')) return 'public_swim';
  if (l.includes('aquafit') || l.includes('aerobics') || l.includes('aqua')) return 'aquafit';
  if (l.includes('therapy') || l.includes('warm') || l.includes('hot')) return 'therapy_pool';
  if (l.includes('family')) return 'family_swim';
  if (l.includes('lesson')) return 'lessons';
  return 'other';
};

export const getCalgaryNow = (): Date => {
  const now = new Date();
  
  // Calgary is Mountain Standard Time (UTC-7) or Mountain Daylight Time (UTC-6)
  // MDT is active from the second Sunday of March to the first Sunday of November
  const year = now.getUTCFullYear();
  
  // DST Start: Second Sunday in March (at 2:00 AM MST = 9:00 AM UTC)
  const march1 = new Date(Date.UTC(year, 2, 1));
  const march1Day = march1.getUTCDay();
  const dstStartDay = 14 - ((march1Day + 6) % 7);
  const dstStart = new Date(Date.UTC(year, 2, dstStartDay, 9, 0, 0));
  
  // DST End: First Sunday in November (at 2:00 AM MDT = 8:00 AM UTC)
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const nov1Day = nov1.getUTCDay();
  const dstEndDay = 7 - ((nov1Day + 6) % 7);
  const dstEnd = new Date(Date.UTC(year, 10, dstEndDay, 8, 0, 0));
  
  const isDST = now >= dstStart && now < dstEnd;
  const calgaryOffsetHours = isDST ? -6 : -7;
  
  // We want a Date object whose local representation matches Calgary clock time.
  const localOffsetMs = now.getTimezoneOffset() * 60000;
  const calgaryLocalTimeMs = now.getTime() + (calgaryOffsetHours * 3600000) + localOffsetMs;
  
  return new Date(calgaryLocalTimeMs);
};

export const parseScheduleForStatus = (weeklySchedule: string, source?: string): ParsedStatus => {
  const now = getCalgaryNow();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getDay()];
  
  const segments = weeklySchedule.split('|').map(s => s.trim());
  const todaySegment = segments.find(s => {
    const lowerS = s.toLowerCase();
    const lowerDay = currentDay.toLowerCase();
    return lowerS.startsWith(lowerDay) || 
           lowerS.startsWith(lowerDay.substring(0, 3)) ||
           lowerS.includes(lowerDay);
  });

  const confidence = source === 'official' ? 'High' : (source === 'search' ? 'Medium' : 'Low');

  if (!todaySegment || todaySegment.toLowerCase().includes('closed')) {
    return { status: 'closed', displayText: 'Closed Today', activities: [], confidence };
  }

  // Improved extraction for multiple windows/activities
  const activities: { type: string, label: string, time: string, isActive?: boolean }[] = [];
  
  const activityMatches = todaySegment.matchAll(/([^:|,]+):\s*(\d{1,2}(?::\d{2})?\s*[AP]\.?M\.?\s*[-–—to ]+\s*\d{1,2}(?::\d{2})?\s*[AP]\.?M\.?)/gi);
  
  for (const m of activityMatches) {
    const label = m[1].trim();
    const time = m[2].trim();
    activities.push({
      type: normalizeActivityType(label),
      label,
      time
    });
  }

  if (activities.length === 0) {
    const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|A\.M\.|P\.M\.|am|pm))/gi;
    const allTimes = todaySegment.match(new RegExp(`${timeRegex.source}\\s*[\\-–—to ]+\\s*${timeRegex.source}`, 'gi'));
    
    if (allTimes) {
      allTimes.forEach(timeStr => {
        const lower = todaySegment.toLowerCase();
        let type = 'other';
        let label = 'Swimming';
        if (lower.includes('lane') || lower.includes('lap') || lower.includes('length')) { type = 'lane_swim'; label = 'Lane Swim'; }
        else if (lower.includes('public') || lower.includes('open')) { type = 'public_swim'; label = 'Public Swim'; }
        
        activities.push({ type, label, time: timeStr });
      });
    }
  }

  if (activities.length === 0) {
    return { status: 'unknown', displayText: 'PLEASE CHECK STATUS', activities: [], confidence };
  }

  const parseTime = (timeStr: string) => {
    const cleaned = timeStr.trim().toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ');
    const match = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const ampm = match[3];

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  let finalStatus = 'closed' as 'open' | 'closed' | 'unknown' | 'limited';
  let displayText = 'Closed';
  let nextOpening = null;
  let activeEndTimes: Date[] = [];
  let earliestTodayStart: Date | null = null;
  let latestTodayEnd: Date | null = null;

  const timePairRegex = /(\d{1,2}(?::\d{2})?\s*[AP]\.?M\.?)\s*[\-–—to\s]+\s*(\d{1,2}(?::\d{2})?\s*[AP]\.?M\.?)/i;

  activities.forEach(act => {
    const timeMatch = act.time.match(timePairRegex);
    if (timeMatch) {
      const start = parseTime(timeMatch[1]);
      const end = parseTime(timeMatch[2]);
      if (start && end) {
        if (!earliestTodayStart || start < earliestTodayStart) {
          earliestTodayStart = start;
        }
        if (!latestTodayEnd || end > latestTodayEnd) {
          latestTodayEnd = end;
        }

        if (now >= start && now <= end) {
          act.isActive = true;
          activeEndTimes.push(end);
        } else if (now < start) {
          if (!nextOpening || start < nextOpening) {
            nextOpening = start;
          }
        }
      }
    }
  });

  const activeActivities = activities.filter(act => act.isActive);
  const activePublicSwim = activeActivities.filter(act => act.type !== 'lessons');
  const activeLessons = activeActivities.filter(act => act.type === 'lessons');

  if (activePublicSwim.length > 0) {
    finalStatus = 'open';
  } else if (activeLessons.length > 0) {
    finalStatus = 'limited';
  } else if (earliestTodayStart && latestTodayEnd && now >= earliestTodayStart && now <= latestTodayEnd) {
    finalStatus = 'limited';
  } else {
    finalStatus = 'closed';
  }

  if (finalStatus === 'open' && activeEndTimes.length > 0) {
    const openEndTimes = activePublicSwim
      .map(act => {
        const m = act.time.match(timePairRegex);
        return m ? parseTime(m[2]) : null;
      })
      .filter((t): t is Date => t !== null);

    const latestEnd = openEndTimes.length > 0 
      ? new Date(Math.max(...openEndTimes.map(t => t.getTime())))
      : new Date(Math.max(...activeEndTimes.map(t => t.getTime())));

    const hours = latestEnd.getHours();
    const mins = latestEnd.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    displayText = `Open until ${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  } else if (finalStatus === 'limited' && latestTodayEnd) {
    const hours = latestTodayEnd.getHours();
    const mins = latestTodayEnd.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    if (nextOpening) {
      const nextH = nextOpening.getHours();
      const nextM = nextOpening.getMinutes();
      const nextAmpm = nextH >= 12 ? 'PM' : 'AM';
      const nextDisplayH = nextH % 12 || 12;
      const nextTimeStr = `${nextDisplayH}:${nextM.toString().padStart(2, '0')} ${nextAmpm}`;
      displayText = `Limited Pool Availability (Lessons/Gap active - Hot Tub/Steam open • Next swim at ${nextTimeStr})`;
    } else {
      displayText = `Limited Pool Availability (Lessons/Gap active - Hot Tub/Steam open until ${displayHours}:${mins.toString().padStart(2, '0')} ${ampm})`;
    }
  } else if (finalStatus === 'closed' && nextOpening) {
    const hours = nextOpening.getHours();
    const mins = nextOpening.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    displayText = `Opens at ${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  } else if (finalStatus === 'closed') {
    displayText = 'Closed for the day';
  }

  return { 
    status: finalStatus, 
    displayText, 
    activities, 
    confidence 
  };
};
