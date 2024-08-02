import { ThemeOptions, ThemeProvider, createTheme } from '@mui/material/styles';

export const themeOptions: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: {
            main: '#003c6c',
            contrastText: '#fffce6',
        },
        secondary: {
            main: '#fdc700',
        },
    },
    typography: {
        fontFamily: 'Roboto',
    },
};
export const theme = createTheme(themeOptions);
