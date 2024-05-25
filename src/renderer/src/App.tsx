/// <reference types="vite-plugin-svgr/client" />

// TODO:
// - >100% progress

import { useEffect, useState } from 'react';
import ModList from './ModList';
import LocalMod from '@preload/LocalMod';
import { Mod } from './models/mod-io/Mod';
import ModIOInteraction from './mod-io-interaction';
import { Config } from '@preload/Config';
import { BatchItem } from './models/BatchItem';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  CssBaseline,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Stack,
  SvgIcon,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ModioCogBlue from '/src/assets/modio-cog-blue.svg?react';
import {
  BookmarkAdded,
  BrowserUpdated,
  Cached,
  CalendarMonth,
  CloudSync,
  Deselect,
  ErrorOutline,
  Flaky,
  InstallDesktop,
  RemoveCircleOutline,
  Save,
  SelectAll,
  SortByAlpha
} from '@mui/icons-material';
import { ISortByObjectSorter, sort } from 'fast-sort';
import { NewModCard } from './components/NewModCard';

let initializing = false;

async function init(
  setMods: React.Dispatch<React.SetStateAction<Map<number, Mod>>>,
  setBatchItem: (batchItem: BatchItem | null) => void,
  progressAbortSignal: AbortSignal
): Promise<void> {
  try {
    if (initializing) {
      return;
    }
    initializing = true;

    const localMods: LocalMod[] = [];
    const stepCount = 3;

    setBatchItem({
      batchSize: stepCount,
      currentIndex: 0,
      message: 'Init - Loading configuration...',
      percent: 0
    });

    const receivedConfig = (await window.electron.ipcRenderer.invoke('get-config')) as Config;

    setBatchItem({
      batchSize: stepCount,
      currentIndex: 1,
      message: 'Init - Loading Mod.io API...',
      percent: 50
    });
    const targetModIo = new ModIOInteraction(
      receivedConfig.modIo.apiKey,
      receivedConfig.modIo.baseUrl
    );

    window.modList = new ModList(3959, targetModIo);

    setBatchItem({
      batchSize: stepCount,
      currentIndex: 1,
      message: 'Init - Fetching mods...',
      percent: 100
    });

    const subscribedModsLoadingPromise = window.modList.getSubscribedMods(
      {
        Callback: async (message, current, total) => {
          setBatchItem({
            batchSize: stepCount,
            currentIndex: 2,
            message,
            percent: (current / total) * 100
          });
        }
      },
      progressAbortSignal
    );

    const localModsLoadingPromise = window.electron.ipcRenderer.invoke('get-mods').then((mods) => {
      localMods.length = 0; // ????????
      localMods.push(...mods);
    });

    await Promise.all([subscribedModsLoadingPromise, localModsLoadingPromise]);

    const loadedMods = window.modList.getLoadedMods();
    setMods(loadedMods);

    // find mods that are only local and not subscribed
    const onlyLocalMods = localMods.filter((localMod) => !loadedMods.has(localMod.Id));

    console.log('Only local mods:', onlyLocalMods.length);

    setBatchItem({
      batchSize: stepCount,
      currentIndex: 3,
      message: 'Loading local mods...',
      percent: 0
    });

    await window.modList.getModsByIds(
      onlyLocalMods.map((mod) => mod.Id),
      {
        Callback: async (message, current, total) => {
          setBatchItem({
            batchSize: stepCount,
            currentIndex: 3,
            message,
            percent: (current / total) * 100
          });
        }
      },
      progressAbortSignal
    );

    // set the local version of the mod io mod based on the local mod
    window.modList.getLoadedMods().forEach((mod) => {
      const localMod = localMods.find((localMod) => localMod.Id === mod.id);
      if (!localMod) {
        return;
      }

      mod.local_version = localMod.Taint;
      mod.local_broken = localMod.Broken;
    });

    setBatchItem({
      batchSize: stepCount,
      currentIndex: 3,
      message: 'Updating UI...',
      percent: 100
    });

    setMods(window.modList.getLoadedMods());

    setBatchItem(null);
  } catch (e) {
    setBatchItem({
      batchSize: 0,
      currentIndex: 0,
      message: 'Error during initialization',
      percent: 100
    });
    console.error(e);
  }
}

// async function downloadSingle(mod: Mod): Promise<void> {
// const dependencyMods: Mod[] = mod.dependencies
//   ? window.modList.getLoadedMods().filter((m) => {
//       return mod.dependency_mod_ids?.find((d) => d === m.id);
//     })
//   : [];
// window.electron.ipcRenderer.send('download-mod', [mod, ...dependencyMods]);
// }

function App(): JSX.Element {
  const [mods, setMods] = useState<Map<number, Mod>>(new Map<number, Mod>());

  const progressAbortController = new AbortController();

  const getModsFilterSearchSort = (modsMap: Map<number, Mod>): Mod[] => {
    const startTime = performance.now();
    console.log('Filtering, searching and sorting mods...');
    const mods: Mod[] = [];
    modsMap.forEach((mod: Mod) => {
      if (filters.includes('subscribed') && !mod.subscribed) {
        return;
      }
      if (filters.includes('installed') && mod.local_version === 0) {
        return;
      }
      if (
        filters.includes('update') &&
        mod.local_version === mod.platforms.find((p) => p.platform === 'windows')?.modfile_live
      ) {
        return;
      }
      if (filters.includes('broken') && !mod.local_broken) {
        return;
      }
      if (filters.includes('selected') && !selectedMods.find((m) => m.id === mod.id)) {
        return;
      }

      if (
        search.length > 0 &&
        !mod.name.toLowerCase().includes(search.toLowerCase()) &&
        !mod.description_plaintext.toLowerCase().includes(search.toLowerCase())
      ) {
        return;
      }

      mods.push(mod);
    });

    const sortBy: ISortByObjectSorter<Mod>[] = sortList.map((sort) => sortables.get(sort)!.sort);
    const sorted = sort(mods).by(sortBy);

    console.log('Filtering, searching and sorting mods took:', performance.now() - startTime, 'ms');
    return sorted;
  };

  useEffect(() => {
    init(setMods, setBatchItemActual, progressAbortController.signal);
  }, []);

  const [batchItem, setBatchItem] = useState<BatchItem | null>({
    batchSize: 0,
    currentIndex: 0,
    message: 'Startup...',
    percent: 0
  });

  let batchItemActual = batchItem;
  const [batchList, setBatchList] = useState<BatchItem[]>([]);
  const batchListActual = batchList;

  function setBatchItemActual(batchItem: BatchItem | null): void {
    if (batchItem !== null) {
      batchListActual.push(batchItem);
    }

    setBatchItem(batchItem);
    setBatchList(batchListActual);
  }

  useEffect(() => {
    window.electron.ipcRenderer.on('start-batch-element', (_, args) => {
      batchItemActual = args;
      setBatchItemActual(args);
    });
    window.electron.ipcRenderer.on('progress-batch-element', (_, args) => {
      const newItem = { ...batchItemActual, ...args };
      batchItemActual = newItem;
      setBatchItemActual(newItem);
    });
    window.electron.ipcRenderer.on('complete-batch-element', () => {
      setBatchItemActual(null);
    });
  }, []);

  const theme = createTheme({
    palette: {
      mode: 'dark'
    }
  });

  // new stuff

  const [search, setSearch] = useState<string>('');
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.target.value);
  };

  const [filters, setFilters] = useState<string[]>(['update']);
  const handleFilters = (_: React.MouseEvent<HTMLElement>, newFilters: string[]): void => {
    setFilters(newFilters);
  };

  const [sortList, setSortList] = useState<string[]>([
    'update',
    'broken',
    'subscribed',
    'installed',
    'date'
  ]);
  const handleSort = (_: React.MouseEvent<HTMLElement>, newSort: string[]): void => {
    if (sortList.includes('a-z') && newSort.includes('date')) {
      newSort = newSort.filter((s) => s !== 'a-z');
    } else if (sortList.includes('date') && newSort.includes('a-z')) {
      newSort = newSort.filter((s) => s !== 'date');
    }
    setSortList(newSort);
  };

  interface Sortable {
    name: string;
    icon: JSX.Element;
    sort: ISortByObjectSorter<Mod>;
  }

  const sortables: Map<string, Sortable> = new Map<string, Sortable>([
    [
      'a-z',
      {
        name: 'Alphabetically',
        icon: <SortByAlpha fontSize="small" />,
        sort: { asc: (mod) => mod.name }
      }
    ],
    [
      'date',
      {
        name: 'Last updated',
        icon: <CalendarMonth fontSize="small" />,
        sort: { desc: (mod) => mod.date_updated }
      }
    ],
    [
      'subscribed',
      {
        name: 'Subscribed',
        icon: <BookmarkAdded fontSize="small" />,
        sort: { desc: (mod) => mod.subscribed }
      }
    ],
    [
      'installed',
      {
        name: 'Installed',
        icon: <Save fontSize="small" />,
        sort: { desc: (mod) => mod.local_version ?? 0 > 0 }
      }
    ],
    [
      'update',
      {
        name: 'Update required',
        icon: <BrowserUpdated fontSize="small" />,
        sort: {
          desc: (mod) =>
            mod.local_version !== mod.platforms.find((p) => p.platform === 'windows')?.modfile_live
        }
      }
    ],
    [
      'broken',
      {
        name: 'Broken',
        icon: <ErrorOutline fontSize="small" />,
        sort: { desc: (mod) => mod.local_broken }
      }
    ]
  ]);

  const modsFilteredSearchedSorted = getModsFilterSearchSort(mods);

  const [selectedMods, setSelectedMods] = useState<Mod[]>([]);
  const handleSelectAll = (): void => {
    setSelectedMods(modsFilteredSearchedSorted);
  };
  const handleDeselectAll = (): void => {
    setSelectedMods([]);
  };
  const handleInvertSelection = (): void => {
    setSelectedMods(
      modsFilteredSearchedSorted.filter((mod) => !selectedMods.find((m) => m.id === mod.id))
    );
  };
  const handleSelectMod = (mod: Mod): void => {
    if (selectedMods.find((m) => m.id === mod.id)) {
      setSelectedMods(selectedMods.filter((m) => m.id !== mod.id));
    } else {
      setSelectedMods([...selectedMods, mod]);
    }
  };

  // const mods: Mod[] = [
  //   {
  //     id: 3959,
  //     name: 'PavlovArtists Weapon Skin Pack',
  //     logo: {
  //       thumb_320x180: 'https://thumb.modcdn.io/mods/e77c/3467755/crop_320x180/skinmenu.png'
  //     },
  //     local_version: 1337,
  //     local_broken: false,
  //     subscribed: true,
  //     platforms: [
  //       {
  //         platform: 'windows',
  //         modfile_live: 1338
  //       }
  //     ],
  //     modfile: {
  //       filesize: 1337,
  //       download: { binary_url: '' },
  //       filehash: { md5: '1337' },
  //       filename: '1337.zip'
  //     },
  //     description_plaintext: 'This is a test mod',
  //     dependencies: true,
  //     dependency_mod_ids: []
  //   },
  //   {
  //     id: 39123,
  //     name: 'PavlovArtists Weapon Skin Pack',
  //     logo: {
  //       thumb_320x180: 'https://thumb.modcdn.io/mods/e77c/3467755/crop_320x180/skinmenu.png'
  //     },
  //     local_version: 0,
  //     local_broken: false,
  //     subscribed: false,
  //     platforms: [
  //       {
  //         platform: 'windows',
  //         modfile_live: 1338
  //       }
  //     ],
  //     modfile: {
  //       filesize: 1337,
  //       download: { binary_url: '' },
  //       filehash: { md5: '1337' },
  //       filename: '1337.zip'
  //     },
  //     description_plaintext: 'This is a test mod',
  //     dependencies: true,
  //     dependency_mod_ids: []
  //   }
  // ];

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Snackbar
          open={batchItemActual !== null}
          message={
            <Stack
              direction="column"
              sx={{ width: '100%', display: 'block', alignItems: 'center' }}
            >
              <Typography sx={{ flex: 1 }}>{batchItemActual?.message}</Typography>
              <LinearProgress
                variant="determinate"
                value={batchItemActual?.percent ?? 0}
                sx={{ width: '100%' }}
              />
              {batchItemActual === null || batchItemActual.batchSize === 0 ? null : (
                <>
                  <Typography sx={{ flex: 1 }}>
                    {batchItemActual.currentIndex} / {batchItemActual.batchSize}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(batchItemActual.currentIndex / batchItemActual.batchSize) * 100}
                    sx={{ width: '100%' }}
                  />
                </>
              )}
            </Stack>
          }
          anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
          sx={{ width: '100%', paddingX: 2 }}
          ContentProps={{
            sx: {
              width: '100%',
              '& .MuiSnackbarContent-message': {
                width: '100%',
                textAlign: 'left'
              }
            }
          }}
        />
        <Stack direction="row" spacing={2}>
          <Box>
            <Toolbar>
              <SvgIcon sx={{ width: 96, height: 120 }}>
                <ModioCogBlue width={24} height={24} />
              </SvgIcon>
              <Typography variant="h6">Mod Manager</Typography>
            </Toolbar>
            <Divider />
            <List>
              <ListItem disablePadding>
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
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <SettingsIcon sx={{ width: 48, height: 48 }} />
                  </ListItemIcon>
                  <ListItemText primary="Settings" />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>

          <Box sx={{ padding: 1, width: '100%' }}>
            <Box sx={{ width: '100%' }}>
              <TextField
                variant="outlined"
                label="Search"
                fullWidth
                onChange={handleSearch}
                value={search}
              />
              <ToggleButtonGroup fullWidth value={filters} onChange={handleFilters}>
                <Tooltip title="Filter subscribed">
                  <ToggleButton value="subscribed">
                    <BookmarkAdded fontSize="small" sx={{ mr: 1 }} /> Subscribed
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Filter installed">
                  <ToggleButton value="installed">
                    <Save fontSize="small" sx={{ mr: 1 }} />
                    Installed
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Filter update required">
                  <ToggleButton value="update">
                    <BrowserUpdated fontSize="small" sx={{ mr: 1 }} />
                    Update required
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Filter broken">
                  <ToggleButton value="broken">
                    <ErrorOutline fontSize="small" sx={{ mr: 1 }} />
                    Broken
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Filter selected">
                  <ToggleButton value="selected">
                    <SelectAll fontSize="small" sx={{ mr: 1 }} />
                    Selected
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
              <ToggleButtonGroup fullWidth value={sortList} onChange={handleSort}>
                <Tooltip title="Sort by name">
                  <ToggleButton value="a-z">
                    <SortByAlpha fontSize="small" sx={{ mr: 1 }} />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Sort by last updated">
                  <ToggleButton value="date">
                    <CalendarMonth fontSize="small" sx={{ mr: 1 }} />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Sort by subscribed">
                  <ToggleButton value="subscribed">
                    <BookmarkAdded fontSize="small" sx={{ mr: 1 }} />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Sort by installed">
                  <ToggleButton value="installed">
                    <Save fontSize="small" sx={{ mr: 1 }} />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Sort by update required">
                  <ToggleButton value="update">
                    <BrowserUpdated fontSize="small" sx={{ mr: 1 }} />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Sort by broken">
                  <ToggleButton value="broken">
                    <ErrorOutline fontSize="small" sx={{ mr: 1 }} />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
              <Divider sx={{ marginY: 1 }} />
              <ButtonGroup fullWidth>
                <Tooltip title="Select all">
                  <Button variant="outlined" startIcon={<SelectAll />} onClick={handleSelectAll}>
                    Select all
                  </Button>
                </Tooltip>
                <Tooltip title="Deselect all">
                  <Button variant="outlined" startIcon={<Deselect />} onClick={handleDeselectAll}>
                    Deselect all
                  </Button>
                </Tooltip>
                <Tooltip title="Invert selection">
                  <Button variant="outlined" startIcon={<Flaky />} onClick={handleInvertSelection}>
                    Invert selection
                  </Button>
                </Tooltip>
              </ButtonGroup>
              <ButtonGroup fullWidth>
                <Tooltip title="Install selected mods">
                  <Button
                    variant="outlined"
                    startIcon={<InstallDesktop />}
                    disabled={selectedMods.length == 0}
                    color="success"
                  >
                    Install
                  </Button>
                </Tooltip>
                <Tooltip title="Update or reinstall selected mods">
                  <Button
                    variant="outlined"
                    startIcon={<CloudSync />}
                    disabled={selectedMods.length == 0}
                    color="success"
                  >
                    Update
                  </Button>
                </Tooltip>
                <Tooltip title="Refresh metadata of selected mods">
                  <Button
                    variant="outlined"
                    startIcon={<Cached />}
                    disabled={selectedMods.length == 0}
                  >
                    Refresh metadata
                  </Button>
                </Tooltip>
                <Tooltip title="Uninstall selected mods">
                  <Button
                    variant="outlined"
                    startIcon={<RemoveCircleOutline />}
                    disabled={selectedMods.length == 0}
                    color="error"
                  >
                    Uninstall
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>
            <Box sx={{ overflow: 'auto', maxHeight: '70vh' }}>
              <Stack direction="column" spacing={1} useFlexGap margin={1}>
                {modsFilteredSearchedSorted.map((mod) => (
                  <NewModCard
                    key={mod.id}
                    mod={mod}
                    selected={selectedMods.find((m) => m.id === mod.id) !== undefined}
                    onSelect={handleSelectMod}
                  />
                ))}
              </Stack>
            </Box>
          </Box>
        </Stack>
        {/* <Container sx={{ bgcolor: '#003366' }}> */}

        {/* <Progress
            batchItemActual={batchItemActual}
            batchList={batchList}
            progressAbortController={progressAbortController}
          />
          {mods.length === 0 ? null : (
            <>
              <Typography variant="h4" sx={{ color: 'white', textAlign: 'center', padding: 2 }}>
                We have {mods.length} mods
              </Typography>
              <ModListComponent mods={mods} downloadSingle={downloadSingle} />
            </>
          )}
          ; */}
        {/* </Container> */}
      </ThemeProvider>
    </>
  );
}

export default App;
