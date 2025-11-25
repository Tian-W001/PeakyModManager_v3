import { useState, useCallback } from "react";

export const useDiffList = () => {
  const [diffList, setDiffList] = useState<{ modName: string; enable: boolean }[]>([]);

  const clearDiffList = useCallback(() => {
    setDiffList([]);
  }, []);

  const appendToDiffList = useCallback((modName: string, enable: boolean) => {
    //before appending, check if modName already exists in diffList,
    //if it does, and enabled is opposite of existing state, remove it from diffList
    setDiffList((prevDiffList) => {
      const existingIndex = prevDiffList.findIndex((item) => item.modName === modName);
      if (existingIndex !== -1) {
        const existingItem = prevDiffList[existingIndex];
        if (existingItem.enable !== enable) {
          const newDiffList = [...prevDiffList];
          newDiffList.splice(existingIndex, 1);
          return newDiffList;
        } else {
          return prevDiffList;
        }
      } else {
        return [...prevDiffList, { modName, enable }];
      }
    });
  }, []);

  return { diffList, appendToDiffList, clearDiffList };
};
