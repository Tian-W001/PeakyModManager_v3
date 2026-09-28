import { useTranslation } from "react-i18next";
import { getOutfitIds } from "@shared/outfit";
import { getOutfitIcon } from "@renderer/utils/outfitAvatars";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedCharacter, selectSelectedOutfitId, setSelectedOutfitId } from "@renderer/redux/slices/uiSlice";
import ZzzButton from "./zzzButton";
import ZzzSelect from "./zzzSelect";

const OutfitDropdown = ({ isVisible }: { isVisible: boolean }) => {
  const dispatch = useAppDispatch();
  const selectedCharacter = useAppSelector(selectSelectedCharacter);
  const { t } = useTranslation();
  const selectedOutfitId = useAppSelector(selectSelectedOutfitId);

  if (!isVisible || selectedCharacter === "All" || selectedCharacter === "Unknown") return null;

  return (
    <ZzzSelect
      key={selectedCharacter}
      value={String(selectedOutfitId)}
      options={[
        { value: "All", label: t("outfits.all") },
        ...getOutfitIds(selectedCharacter).map((id) => {
          const icon = getOutfitIcon(selectedCharacter, id);
          return {
            value: String(id),
            label: t(id === 0 ? "outfits.none" : `characters.outfits.${selectedCharacter}.${id}`),
            labelIcon: icon && (
              <img src={icon} alt="" className="h-8 shrink-0 rounded-sm object-fill" draggable={false} />
            ),
          };
        }),
      ]}
      onChange={(value) => dispatch(setSelectedOutfitId(value === "All" ? "All" : Number(value)))}
      dropdownClassName="w-80"
      renderTrigger={({ onClick }) => <ZzzButton type="Outfit" onClick={onClick} />}
    />
  );
};

export default OutfitDropdown;
