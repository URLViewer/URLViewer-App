import type { IconType } from "react-icons";
import { BsBookmarkFill } from "react-icons/bs";
import {
  LuBookmark,
  LuCheck,
  LuChevronDown,
  LuChevronsLeft,
  LuChevronsRight,
  LuDownload,
  LuEllipsisVertical,
  LuGauge,
  LuListVideo,
  LuMaximize,
  LuMinimize,
  LuPause,
  LuPlay,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuSettings,
  LuTrash2,
  LuUsers,
  LuVolume2,
  LuVolumeX,
  LuZap
} from "react-icons/lu";
import { MdForward10, MdForward5, MdReplay10, MdReplay5 } from "react-icons/md";

type IconName =
  | "menu"
  | "close"
  | "plus"
  | "library"
  | "group"
  | "settings"
  | "play"
  | "pause"
  | "trash"
  | "check"
  | "bolt"
  | "search"
  | "volume"
  | "mute"
  | "fullscreen"
  | "fullscreen-exit"
  | "download"
  | "back10"
  | "back5"
  | "fwd5"
  | "fwd10"
  | "speed"
  | "dots"
  | "chevron-down"
  | "bookmark"
  | "bookmark-solid"
  | "refresh";

type IconProps = {
  name: IconName;
  className?: string;
};

const ICON_MAP: Record<IconName, IconType> = {
  menu: LuChevronsRight,
  close: LuChevronsLeft,
  plus: LuPlus,
  library: LuListVideo,
  group: LuUsers,
  settings: LuSettings,
  play: LuPlay,
  pause: LuPause,
  trash: LuTrash2,
  check: LuCheck,
  bolt: LuZap,
  search: LuSearch,
  volume: LuVolume2,
  mute: LuVolumeX,
  fullscreen: LuMaximize,
  "fullscreen-exit": LuMinimize,
  download: LuDownload,
  back10: MdReplay10,
  back5: MdReplay5,
  fwd5: MdForward5,
  fwd10: MdForward10,
  speed: LuGauge,
  dots: LuEllipsisVertical,
  "chevron-down": LuChevronDown,
  bookmark: LuBookmark,
  "bookmark-solid": BsBookmarkFill,
  refresh: LuRefreshCw,
};

export function Icon({ name, className = "h-5 w-5" }: IconProps) {
  const Component = ICON_MAP[name];
  return <Component className={className} aria-hidden="true" focusable="false" />;
}
