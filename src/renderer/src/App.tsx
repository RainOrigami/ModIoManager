/// <reference types="vite-plugin-svgr/client" />

import { useEffect, useRef, useState } from 'react';
import ModList from './ModList';
import LocalMod from '@preload/LocalMod';
import { Mod } from './models/mod-io/Mod';
import ModIOInteraction from './mod-io-interaction';
import { Config } from '@preload/Config';
import { BatchItem } from './models/BatchItem';
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  CardHeader,
  Checkbox,
  Chip,
  CssBaseline,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme
} from '@mui/material';

import {
  BookmarkAdded,
  BookmarkRemove,
  BrowserUpdated,
  Cached,
  CalendarMonth,
  CloudSync,
  ErrorOutline,
  InstallDesktop,
  Public,
  RemoveCircleOutline,
  Save,
  SortByAlpha
} from '@mui/icons-material';
import { ISortByObjectSorter, sort } from 'fast-sort';
import ModSearchFilterSort from './components/ModSearchFilterSort';
import ModSelection from './components/ModSelection';
import Menu from './components/Menu';
import { FixedSizeList as List } from 'react-window';
import useResizeObserver from '@react-hook/resize-observer';
import moment from 'moment';
import ModioCogBlue from '/src/assets/modio-cog-blue.svg?react';
import ModBulkActions from './components/ModBulkActions';

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

  const [listHeight, setListHeight] = useState(0);
  const containerRef = useRef(null);

  useResizeObserver(containerRef, (entry) => {
    setListHeight(entry.contentRect.height);
  });

  const modsFilteredSearchedSorted = getModsFilterSearchSort(mods);

  const row = ({ index, style }): JSX.Element => {
    const mod = modsFilteredSearchedSorted[index];
    return (
      <Box style={style} sx={{ width: '100%' }}>
        <Stack direction="row" spacing={1}>
          <Box>
            <Checkbox
              checked={selectedMods.find((m) => m.id === mod.id) !== undefined}
              onChange={() => handleSelectMod(mod)}
            />
          </Box>
          <Paper sx={{ width: '100%', padding: 1 }} elevation={5}>
            <Stack direction="column">
              <Stack direction="row">
                <Typography variant="h6" gutterBottom>
                  {mod.name}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="start" spacing={1} sx={{ paddingBottom: 1 }}>
                <Chip
                  label="Installed"
                  color="success"
                  disabled={mod.local_version === 0}
                  size="small"
                />
                <Chip label="Subscribed" color="success" disabled={!mod.subscribed} size="small" />
                <Chip
                  label="Broken"
                  color={mod.local_broken ? 'error' : 'success'}
                  disabled={!mod.local_broken}
                  size="small"
                />
                <Chip
                  label="Update available"
                  color={
                    mod.local_version !=
                    mod.platforms.find((p) => p.platform === 'windows')?.modfile_live
                      ? 'warning'
                      : 'default'
                  }
                  disabled={
                    mod.local_version ===
                    mod.platforms.find((p) => p.platform === 'windows')?.modfile_live
                  }
                  size="small"
                />
              </Stack>
            </Stack>

            <Grid container spacing={1} sx={{ width: '100%' }}>
              <Grid item xs="auto">
                <img src={mod.logo.thumb_320x180} loading="lazy" alt={mod.name} />
              </Grid>
              <Grid item xs>
                <Tooltip title="Open Mod.io page">
                  <Button
                    onClick={() => {
                      window.electron.ipcRenderer.send('open-external', mod.profile_url);
                    }}
                  >
                    <ModioCogBlue width={24} height={24} />
                  </Button>
                </Tooltip>
                <Tooltip title={`Open mod homepage ${mod.homepage_url ?? ''}`}>
                  <span>
                    <Button
                      onClick={() => {
                        window.electron.ipcRenderer.send('open-external', mod.homepage_url);
                      }}
                      disabled={!mod.homepage_url}
                    >
                      <Public />
                    </Button>
                  </span>
                </Tooltip>
                <CardHeader
                  title={
                    <Tooltip title="Open Mod.io profile page">
                      <Button
                        variant="text"
                        onClick={() => {
                          window.electron.ipcRenderer.send(
                            'open-external',
                            mod.submitted_by.profile_url
                          );
                        }}
                      >
                        {mod.submitted_by.username}
                      </Button>
                    </Tooltip>
                  }
                  avatar={
                    <Avatar
                      sx={{ width: 24, height: 24 }}
                      src={mod.submitted_by.avatar.thumb_50x50}
                      alt={mod.submitted_by.username}
                    />
                  }
                />
                <CardHeader
                  title={
                    <Tooltip title={new Date(mod.date_updated * 1000).toLocaleString()}>
                      <Typography>
                        {((text: string): string => {
                          return text.charAt(0).toUpperCase() + text.slice(1);
                        })(moment(new Date(mod.date_updated * 1000)).fromNow())}
                      </Typography>
                    </Tooltip>
                  }
                  avatar={<CalendarMonth />}
                />
              </Grid>
              <Grid item xs="auto">
                <Box sx={{ minWidth: 160, maxWidth: 250 }}>
                  <Button
                    startIcon={mod.subscribed ? <BookmarkRemove /> : <BookmarkAdded />}
                    color={mod.subscribed ? 'inherit' : 'primary'}
                    variant={mod.subscribed ? 'outlined' : 'contained'}
                    sx={{ width: '100%' }}
                  >
                    {mod.subscribed ? 'Unsubscribe' : 'Subscribe'}
                  </Button>
                  <Divider sx={{ paddingY: 1 }} />
                  <ButtonGroup orientation="vertical" sx={{ width: '100%' }}>
                    {mod.local_version === 0 ? (
                      <Button variant="outlined" color="primary" startIcon={<InstallDesktop />}>
                        Install
                      </Button>
                    ) : mod.local_version ==
                      mod.platforms.find((p) => p.platform === 'windows')?.modfile_live ? (
                      <Button variant="outlined" color="warning" startIcon={<CloudSync />}>
                        Reinstall
                      </Button>
                    ) : (
                      <Button variant="outlined" color="success" startIcon={<BrowserUpdated />}>
                        Update
                      </Button>
                    )}
                  </ButtonGroup>
                  <Divider sx={{ paddingY: 1 }} />
                  <Button
                    variant="outlined"
                    color="primary"
                    sx={{ width: '100%' }}
                    startIcon={<Cached />}
                  >
                    Refresh metadata
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={mod.local_version === 0}
                    sx={{ width: '100%' }}
                    startIcon={<RemoveCircleOutline />}
                  >
                    Uninstall
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Stack>
      </Box>
    );
  };

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

        <Box sx={{ display: 'flex', height: '100vh' }}>
          <Menu />
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Box sx={{ padding: 1 }}>
              <ModSearchFilterSort
                search={search}
                handleSearch={handleSearch}
                filters={filters}
                handleFilters={handleFilters}
                sortList={sortList}
                handleSort={handleSort}
              />
              <Divider sx={{ marginY: 1 }} />
              <ModSelection
                handleSelectAll={handleSelectAll}
                handleDeselectAll={handleDeselectAll}
                handleInvertSelection={handleInvertSelection}
              />
              <ModBulkActions selectedMods={selectedMods} />
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }} ref={containerRef}>
              <List
                height={listHeight - 20} // Adjust for padding or margins if necessary
                itemCount={modsFilteredSearchedSorted.length}
                itemSize={280}
                width="100%"
              >
                {row}
              </List>
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    </>
  );
}

export default App;
