import { Avatar } from './Avatar';

export interface User {
  id: number;
  username: string;
  avatar: Avatar;
  profile_url: string;
}
