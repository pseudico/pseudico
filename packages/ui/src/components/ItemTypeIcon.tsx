import {
  CheckSquare,
  CircleHelp,
  FileText,
  Heading,
  Link2,
  ListChecks,
  MapPin,
  MessageSquare,
  StickyNote,
  type LucideIcon
} from "lucide-react";
import { isItemType, type ItemType } from "@local-work-os/core";

const itemTypeIcons: Record<ItemType, LucideIcon> = {
  task: CheckSquare,
  list: ListChecks,
  note: StickyNote,
  file: FileText,
  link: Link2,
  heading: Heading,
  location: MapPin,
  comment: MessageSquare
};

const itemTypeLabels: Record<ItemType, string> = {
  task: "Task",
  list: "List",
  note: "Note",
  file: "File",
  link: "Link",
  heading: "Heading",
  location: "Location",
  comment: "Comment"
};

export type ItemTypeIconProps = {
  itemType: string;
  className?: string;
  size?: number;
};

export function getItemTypeLabel(itemType: string): string {
  return isItemType(itemType) ? itemTypeLabels[itemType] : "Unknown item";
}

export function ItemTypeIcon({
  itemType,
  className,
  size = 18
}: ItemTypeIconProps): React.JSX.Element {
  const Icon = isItemType(itemType) ? itemTypeIcons[itemType] : CircleHelp;

  return (
    <Icon
      aria-hidden="true"
      className={className}
      focusable="false"
      size={size}
      strokeWidth={1.9}
    />
  );
}
