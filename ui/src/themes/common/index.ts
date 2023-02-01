import theme, { ThemeSet } from "styled-theming";

export interface Theme {
    mode: string;
    colors: { [key: string]: ThemeSet };
    sizes: { [key: string]: string };
}

export { theme };
