import clsx from "clsx";
import { ModType, modTypeList } from "../../../shared/modType";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedMenuItem, setSelectedMenuItem } from "@renderer/redux/slices/uiSlice";
import { FaCaretDown, FaCaretUp } from "react-icons/fa6";

const menuItems = ["All", ...modTypeList] as const;

const Menu = ({ className }: { className?: string }) => {
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);

  const dispatch = useAppDispatch();
  const handleMenuItemClick = (modType: ModType | "All") => {
    dispatch(setSelectedMenuItem(modType));
  };

  return (
    <div className={clsx("flex justify-center p-6", className)} id="menu-area">
      <div
        className="m-0.5 flex w-full flex-col items-center gap-2 rounded-2xl bg-linear-to-b from-[#3a3a3a] to-[#272727] p-4 text-white ring-2 ring-white"
        id="menu-container"
      >
        <div className="flex h-8 w-full items-center justify-center rounded-full bg-gray-500" id="menu-upper-button">
          <FaCaretUp className="h-full translate-y-0.5" />
        </div>
        <div className="flex w-full flex-1 flex-col items-center bg-black" id="menu-items-container">
          {menuItems.map((modType: ModType | "All") => (
            <div className="m-1 flex w-full cursor-pointer items-center justify-center rounded p-2" key={modType} onClick={() => handleMenuItemClick(modType)}>
              {modType === selectedMenuItem ? <strong>{modType}</strong> : modType}
            </div>
          ))}
        </div>
        <div className="flex h-8 w-full items-center justify-center rounded-full bg-gray-500" id="menu-lower-button">
          <FaCaretDown className="h-full -translate-y-0.5" />
        </div>
      </div>
    </div>
  );
};

export default Menu;
