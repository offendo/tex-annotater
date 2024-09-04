import Paper from '@mui/material/Paper';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import * as React from 'react';

type DataTableProps<T> = {
    rows: T[];
    columns: GridColDef[];
    onSelect: () => any;
    allowMultiple: boolean;
}

export default function DataTable<T>(props: DataTableProps<T>) {
    return (
        <DataGrid
            rows={props.rows}
            columns={props.columns}
            pageSizeOptions={[5, 10, { label: "All", value: -1 }]}
            checkboxSelection={props.allowMultiple}
            onCellClick={props.onSelect}
            sx={{ border: 0 }}
        />
    );
}
