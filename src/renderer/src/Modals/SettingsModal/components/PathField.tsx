const PathField = ({
  label,
  value,
  placeholder,
  onClick,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onClick: () => void;
}) => (
  <div className="hover:text-zzzYellow relative flex flex-row items-center justify-between gap-4 rounded-full bg-black px-3 py-1 text-white shadow-[1px_1px_1px_#fff2]">
    <span className="truncate">{label}</span>
    <input
      className="flex-1 cursor-pointer text-right outline-none"
      value={value || placeholder}
      readOnly
      onClick={onClick}
    />
  </div>
);

export default PathField;
