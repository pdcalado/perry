import React, { useEffect } from "react";
import { HashRouter as Router, Route, Switch } from "react-router-dom";
import {
    RingLoading as Loading,
    ContextMenuProvider,
    ToastProvider,
} from "components";
import { RecoilRoot } from "recoil";
import { RedirectLoginOptions } from "@auth0/auth0-spa-js";
import authConfig from "./auth_config.json";
import { Auth0Provider, onRedirectCallback, useAuth0 } from "utils";
import "bootstrap/dist/css/bootstrap.min.css";
import { EntityRelationProvider } from "ermodel";
import { EventBrokerProvider } from "eventBroker";

// Containers
const DockUI = React.lazy(() => import("layouts/dock/dock"));

const Routed = () => {
    const {
        isAuthenticated,
        loading,
        loginWithRedirect,
        logout,
        user,
    } = useAuth0();

    useEffect(() => {
        if (isAuthenticated || loading) return;

        const loc = window.location;

        const loginOptions: RedirectLoginOptions = {
            appState: {
                targetUrl: loc.pathname + loc.hash + loc.search,
            },
        };

        loginWithRedirect(loginOptions);
    }, [isAuthenticated, loginWithRedirect, loading]);

    if (loading || !isAuthenticated) {
        return <Loading />;
    }

    const Layout = () => (
        <DockUI
            onLogout={() => logout({ returnTo: window.location.origin })}
            userAvatar={user && user.picture}
            brandSource="/logo192.png"
        />
    );

    return (
        <Router>
            <React.Suspense fallback={Loading()}>
                <Switch>
                    <Route path="/" component={Layout} />
                </Switch>
            </React.Suspense>
        </Router>
    );
};

const App = () => (
    <React.StrictMode>
        <RecoilRoot>
            <Auth0Provider
                domain={authConfig.domain}
                client_id={authConfig.clientId}
                redirect_uri={window.location.origin}
                audience={authConfig.audience}
                onRedirectCallback={onRedirectCallback}
            >
                <EntityRelationProvider>
                    <EventBrokerProvider>
                        <ContextMenuProvider>
                            <React.Fragment>
                                <Routed />
                                <ToastProvider />
                            </React.Fragment>
                        </ContextMenuProvider>
                    </EventBrokerProvider>
                </EntityRelationProvider>
            </Auth0Provider>
        </RecoilRoot>
    </React.StrictMode>
);

export default App;
