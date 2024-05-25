import {
  BookmarkAdded,
  Save,
  BrowserUpdated,
  ErrorOutline,
  SelectAll,
  SortByAlpha,
  CalendarMonth
} from '@mui/icons-material';
import { TextField, ToggleButtonGroup, Tooltip, ToggleButton } from '@mui/material';
import React from 'react';

type Props = {
  search: string;
  handleSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
  filters: string[];
  handleFilters: (event: React.MouseEvent<HTMLElement>, newFilters: string[]) => void;
  sortList: string[];
  handleSort: (event: React.MouseEvent<HTMLElement>, newSortList: string[]) => void;
};

function ModSearchFilterSort({
  search,
  handleSearch,
  filters,
  handleFilters,
  sortList,
  handleSort
}: Props): JSX.Element {
  return (
    <>
      <TextField
        variant="outlined"
        label="Search"
        fullWidth
        onChange={handleSearch}
        value={search}
        sx={{ marginBottom: 1 }}
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
    </>
  );
}

export default ModSearchFilterSort;
