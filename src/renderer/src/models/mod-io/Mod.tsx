import { Logo } from './Logo';
import { ModFile } from './ModFile';
import { Platform } from './Platform';
import { User } from './User';

export interface Mod {
  id: number;
  name: string;
  logo: Logo;
  description_plaintext: string;
  local_version: number | null;
  local_broken: boolean;
  subscribed: boolean;
  platforms: Platform[];
  dependencies: boolean;
  modfile: ModFile;
  dependency_mod_ids: number[];
  date_updated: number;
  homepage_url: string;
  profile_url: string;
  submitted_by: User;
}
