export const CONTAINER_MEDIA_ROLES = ["project_banner", "contact_avatar"] as const;

export type ContainerMediaRole = (typeof CONTAINER_MEDIA_ROLES)[number];

export type ContainerMediaRecord = {
  id: string;
  workspaceId: string;
  containerId: string;
  attachmentId: string;
  role: ContainerMediaRole;
  thumbnailStoragePath: string | null;
  altText: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export function isContainerMediaRole(value: string): value is ContainerMediaRole {
  return (CONTAINER_MEDIA_ROLES as readonly string[]).includes(value);
}
