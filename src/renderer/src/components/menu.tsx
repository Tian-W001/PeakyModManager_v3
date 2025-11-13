import clsx from "clsx";

const Menu = ({ className }: { className?: string }) => {
  return (
    <div className={clsx("flex justify-center bg-green-200 p-6", className)} id="menu-area">
      <div className="m-0.5 flex w-full flex-col items-center gap-2 rounded-2xl bg-gray-400 p-4" id="menu-container">
        <h1 className="">Menu</h1>
        <div className="flex w-full flex-1 flex-col items-center bg-amber-300" id="menu-items-container">
          <button className="m-2 block rounded bg-green-400 px-4 py-2 font-bold text-white hover:bg-green-500">Home</button>
          <button className="m-2 block rounded bg-green-400 px-4 py-2 font-bold text-white hover:bg-green-500">Library</button>
          <button className="m-2 block rounded bg-green-400 px-4 py-2 font-bold text-white hover:bg-green-500">Mods</button>
          <button className="m-2 block rounded bg-green-400 px-4 py-2 font-bold text-white hover:bg-green-500">Settings</button>
        </div>
      </div>
    </div>
  );
};

export default Menu;
