/// <reference types="vite-plugin-svgr/client" />

import {
  Box,
  Toolbar,
  SvgIcon,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Avatar,
  ListItemText,
  List,
  Drawer
} from '@mui/material';
import ModioCogBlue from '/src/assets/modio-cog-blue.svg?react';
import SettingsIcon from '@mui/icons-material/Settings';
import Versions from './Versions';

export function Menu(): JSX.Element {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 300,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 300, boxSizing: 'border-box' }
      }}
    >
      <Toolbar>
        <SvgIcon sx={{ width: 64, height: 64, paddingRight: 1 }}>
          <ModioCogBlue width={24} height={24} />
        </SvgIcon>
        <Typography variant="h6">Mod Manager</Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem>
          <ListItemButton>
            <ListItemIcon>
              <Avatar
                sx={{ width: 48, height: 48 }}
                alt="Pavlov VR"
                src="https://thumb.modcdn.io/games/806d/3959/crop_64x64/icon.png"
              />
            </ListItemIcon>
            <ListItemText primary="Pavlov VR" />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem>
          <ListItemButton>
            <ListItemIcon>
              <SettingsIcon sx={{ width: 48, height: 48 }} />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ padding: 2 }}>
        <Versions />
      </Box>
    </Drawer>
  );
}

export default Menu;
