import { useEffect, useState, RefObject } from "react";

function useAutoAdjustFontSize(inputRef: RefObject<HTMLInputElement>) {
  const maxFontSize = 50;
  const minFontSize = 32;
  const padding = 5;
  const [fontSize, setFontSize] = useState<number>(maxFontSize);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    let canceled = false;

    const container = document.createElement("div");
    container.style.width = `${input.offsetWidth + padding}px`;
    container.style.height = `${input.offsetHeight + padding}px`;
    container.style.visibility = "hidden";
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.fontSize = `${fontSize}px`;
    container.style.fontFamily = window.getComputedStyle(input).fontFamily;
    container.style.fontWeight = window.getComputedStyle(input).fontWeight;
    container.style.fontStyle = window.getComputedStyle(input).fontStyle;
    container.style.textTransform =
      window.getComputedStyle(input).textTransform;

    document.body.appendChild(container);

    let newFontSize = fontSize;
    while (
      container.offsetWidth > input.offsetWidth ||
      container.offsetHeight > input.offsetHeight
    ) {
      if (newFontSize <= minFontSize) {
        break;
      }
      newFontSize -= 1;
      container.style.fontSize = `${newFontSize}px`;
    }

    if (!canceled && newFontSize !== fontSize) {
      setFontSize(newFontSize);
    }

    document.body.removeChild(container);

    return () => {
      canceled = true;
    };
  }, [inputRef, maxFontSize, minFontSize, padding, fontSize]);

  return { fontSize };
}

export default useAutoAdjustFontSize;
