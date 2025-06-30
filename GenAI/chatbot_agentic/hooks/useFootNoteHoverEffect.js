import { useEffect } from "react";

function useFootnoteHoverEffect() {
  return useEffect(() => {
    const hoverBackground = "#f0f0f0"; // customize your background color

    console.log("something");
    function getFootnoteIdFromAnchorId(anchorId) {
      const match = anchorId.match(/^user-content-fnref-(\d+)(-\d+)?$/);
      return match ? `user-content-fn-${match[1]}` : null;
    }

    function handleMouseEnter(e) {
        console.log("hovered");
      const anchor = e.currentTarget.querySelector(
        'a[id^="user-content-fnref-"]'
      );
      if (!anchor) return;

      const footnoteId = getFootnoteIdFromAnchorId(anchor.id);
      if (!footnoteId) return;

      const footnotesSection = document.querySelector(".footnotes");
      if (!footnotesSection) return;

      const target = footnotesSection.querySelector(`#${footnoteId}`);
      if (target) {
        e.currentTarget.style.backgroundColor = hoverBackground;
        target.style.backgroundColor = hoverBackground;
      }
    }

    function handleMouseLeave(e) {
      const anchor = e.currentTarget.querySelector(
        'a[id^="user-content-fnref-"]'
      );
      if (!anchor) return;

      const footnoteId = getFootnoteIdFromAnchorId(anchor.id);
      if (!footnoteId) return;

      const footnotesSection = document.querySelector(".footnotes");
      if (!footnotesSection) return;

      const target = footnotesSection.querySelector(`#${footnoteId}`);
      if (target) {
        e.currentTarget.style.backgroundColor = "";
        target.style.backgroundColor = "";
      }
    }

    const elements = Array.from(document.querySelectorAll("li, p")).filter(
      (el) => el.querySelector('a[id^="user-content-fnref-"]')
    );

    elements.forEach((el) => {
      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      elements.forEach((el) => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, []);
}

export default useFootnoteHoverEffect;
