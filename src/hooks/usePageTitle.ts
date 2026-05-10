import { useEffect } from "react";

export function usePageTitle(title: string, appendSuffix = true) {
  useEffect(() => {
    const defaultTitle = "EduSync LMS";
    const newTitle = title
      ? appendSuffix
        ? `${title} | ${defaultTitle}`
        : title
      : defaultTitle;

    document.title = newTitle;
  }, [title, appendSuffix]);
}
