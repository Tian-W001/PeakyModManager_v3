import clsx from "clsx";
import { ModType, modTypeList } from "../../../types/modType";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedMenuItem, setSelectedMenuItem } from "@renderer/redux/slices/uiSlice";

const menuItems = ["All", ...modTypeList] as const;

const Menu = ({ className }: { className?: string }) => {
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);

  const dispatch = useAppDispatch();
  const handleMenuItemClick = (modType: ModType | "All") => {
    dispatch(setSelectedMenuItem(modType));
  };

  return (
    <div className={clsx("flex justify-center p-6", className)} id="menu-area">
      <div className="iron-border m-0.5 flex w-full flex-col items-center gap-2 rounded-2xl bg-gray-400 p-4" id="menu-container">
        <h1 className="">Menu</h1>
        <div className="flex w-full flex-1 flex-col items-center" id="menu-items-container">
          {menuItems.map((modType: ModType | "All") => (
            <div
              key={modType}
              onClick={() => handleMenuItemClick(modType)}
              className="m-1 flex w-full cursor-pointer items-center justify-center rounded bg-gray-200 p-2 hover:bg-gray-300"
            >
              {modType === selectedMenuItem ? <strong>{modType}</strong> : modType}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Menu;
