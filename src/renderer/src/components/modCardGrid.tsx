import ModCard from "./modCard";

const ModCardGrid: React.FC = () => {

  return (
    <>
      <div className="flex flex-wrap gap-4 p-4">
        <ModCard />
        <ModCard />
        <ModCard />
        <ModCard />
      </div>
    </>
  );
};

export default ModCardGrid;
