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
    <div className={clsx("flex justify-center p-6", className)} id="menu-area">
      <div
        className="m-0.5 flex w-full flex-col items-center gap-3 rounded-2xl border-3 border-black bg-linear-to-br from-[#3a3a3a] to-[#272727] p-3 text-white outline-3 outline-white/30"
        id="menu-container"
      >
        <div className="menu-button flex h-8 w-full items-center justify-center" id="menu-upper-button">
          <FaCaretUp className="h-full translate-y-0.5 text-inherit" />
        </div>
        <div
          className="no-scrollbar flex w-full flex-1 flex-col items-center gap-0.5 overflow-x-hidden overflow-y-auto rounded-2xl border-8 border-black bg-black shadow-[2px_1px_0px_#ffffff19,-2px_-1px_0px_#00000051]"
          id="menu-items-container"
        >
          {menuItems.map((menuItem) => (
            <div
              className={`m-1 flex h-14 w-full shrink-0 cursor-pointer items-center justify-center rounded-xl p-2 text-xl font-extrabold transition-all ${menuItem === selectedMenuItem ? "bg-zzzYellow text-black" : ""}`}
              key={menuItem}
              onClick={() => handleMenuItemClick(menuItem)}
            >
              {t(`modTypes.${menuItem}`)}
            </div>
          ))}
        </div>
        <div className="menu-button flex h-8 w-full items-center justify-center" id="menu-lower-button">
          <FaCaretDown className="h-full -translate-y-0.5" color="#aaa" />
        </div>
      </div>
    </div>
  );
};

export default Menu;
