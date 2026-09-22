import { useEffect, useState } from 'react';
import { rememberStudy, type StudyLocation } from './studyResume';

export function useStudyBookmark(location: StudyLocation | undefined) {
  const [failed, setFailed] = useState(false);
  const { href, title, position, total } = location ?? {};
  useEffect(() => {
    if (!href || !title || !position || !total) return;
    let active = true;
    void rememberStudy({ href, title, position, total }).then(() => {
      if (active) setFailed(false);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [href, title, position, total]);
  return failed;
}
