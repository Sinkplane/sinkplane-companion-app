export interface ProfileImage {
  width: number;
  height: number;
  path: string;
  childImages?: Array<{
    width: number;
    height: number;
    path: string;
  }>;
}

export interface User {
  id: string;
  username: string;
  profileImage: ProfileImage;
  email?: string;
  displayName?: string;
  creators?: string[];
  scheduledDeletionDate?: string | null;
}
