import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { RingLoading as Loading } from "components";
import * as serviceWorker from "./serviceWorker";
import { ThemeProvider } from "styled-components";
import { code } from "themes";
import "_i18n";

const App = React.lazy(() => import("./App"));

ReactDOM.render(
    <ThemeProvider theme={code}>
        <React.Suspense fallback={Loading()}>
            <App />
        </React.Suspense>
    </ThemeProvider>,
    document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
