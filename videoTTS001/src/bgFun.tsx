import type { HeritageItem } from "./ctrlFun";
import { DEFAULT_IMAGE_URL } from "./ctrlFun";

export const PNG_TUBERS = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png",
];
export const BgFun = ({
  currentItem,
  isPlaying,
}: {
  currentItem: HeritageItem;
  isPlaying: boolean;
}) => {
  return (
    <img
      src={currentItem.imageUrl || DEFAULT_IMAGE_URL}
      alt="Background"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: isPlaying ? 1 : 0.7,
        transition: "opacity 0.3s",
      }}
      onError={(e) => (e.currentTarget.src = DEFAULT_IMAGE_URL)}
    />
  );
};
