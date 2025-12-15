import clsx from "clsx";
import { ModType, modTypeList } from "../../../shared/modType";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedMenuItem, setSelectedMenuItem } from "@renderer/redux/slices/uiSlice";
import { FaCaretDown, FaCaretUp } from "react-icons/fa6";
import { useTranslation } from "react-i18next";

const menuItems = ["All", ...modTypeList] as const;

const Menu = ({ className }: { className?: string }) => {
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);
  const { t } = useTranslation();

  const dispatch = useAppDispatch();
  const handleMenuItemClick = (modType: ModType | "All") => {
    dispatch(setSelectedMenuItem(modType));
  };

  return (
    <div className={clsx("flex justify-center p-4", className)} id="menu-area">
      <div
        className="flex w-full flex-col items-center justify-between rounded-[30px] border-4 border-[#fff3] bg-black px-1 py-2"
        id="menu-container"
      >
        <div className="menuButton" id="menu-upper-button">
          <FaCaretUp className="h-full translate-y-px scale-x-200" color="#000" />
        </div>
        <div
          className="no-scrollbar my-4 flex w-full flex-1 flex-col justify-start overflow-scroll"
          id="menu-items-container"
        >
          {menuItems.map((menuItem) => {
            const isSelected = menuItem === selectedMenuItem;
            return (
              <div
                className={`${!isSelected && "hover:text-zzzYellow"} relative -mt-1 flex h-16 w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-3 rounded-md text-center text-xl font-extrabold italic before:absolute before:top-0 before:h-1 before:w-full before:rounded-full after:absolute after:bottom-0 after:h-1 after:w-full after:rounded-full first:mt-0 ${isSelected ? "bg-zzzYellow z-50 text-black before:bg-[#2220] after:bg-[#2220]" : "z-0 bg-black text-white before:bg-[#222f] after:bg-[#222f]"}`}
                key={menuItem}
                onClick={() => handleMenuItemClick(menuItem)}
              >
                {t(`modTypes.${menuItem}`)}
              </div>
            );
          })}
        </div>
        <div className="menuButton" id="menu-lower-button">
          <FaCaretDown className="h-full -translate-y-px scale-x-200" color="#000" />
        </div>
      </div>
    </div>
  );
};

export default Menu;
