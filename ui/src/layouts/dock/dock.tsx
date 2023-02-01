import React, { Suspense, useState, useRef } from "react";
import { DockLayout, LayoutData, TabData } from "rc-dock";
import "rc-dock/dist/rc-dock.css";
import styled from "styled-components";
import Dynamic from "./dynamic";
import { BasicLoading } from "components";
import { activities } from "_activities_config";
import AsTabs from "./tabsAPI";
import { createTabTitle, TabsProvider } from "utils";
import { useTranslation } from "react-i18next";
import { Info } from "icons";
import { ModalContainer, ModalRef } from "./modalContainer";
import { useRecoilValue } from "recoil";
import { showActivityBar, showSidebar } from "./state";

const Activitybar = React.lazy(() => import("./activitybar"));
const Header = React.lazy(() => import("./header"));
const Sidebar = React.lazy(() => import("./sidebar"));

const defaultGroup = "card custom";

const groups = {
    [defaultGroup]: {
        // the css class for this would be dock-panel-custom
        // this is a custom panel style defined in panel-style.html
        // floatable: true,
        // maximizable: true
        animated: false,
    },
};

const defaultLayoutData = (initialTabs: TabData[]): LayoutData => ({
    // dockbox is of type BoxData
    dockbox: {
        // id: "dockbox-outer",
        mode: "horizontal",
        // A single child of type BoxData
        children: [
            {
                // id: "dockbox-inner",
                mode: "vertical",
                // Children of type PanelData
                children: [
                    {
                        id: "default",
                        group: defaultGroup,
                        tabs: initialTabs,
                        // PanelLock must be non-null to prevent it from
                        // disappearing when all children are gone.
                        panelLock: {
                            minWidth: 200,
                        },
                    },
                ],
            },
        ],
    },
});

const headerHeight = "35px";
const brandHeight = "23px";
const activitybarWidth = "50px";
const userMenuHeight = "30px";

const Wrapper = styled.div<{ $leftColumnWidth: string }>`
    display: grid;
    grid-template-rows: ${headerHeight} 1fr;
    grid-template-columns: ${(props) => props.$leftColumnWidth} 1fr;

    margin: 0;
    padding: 0;
    height: 100vh;
    background: ${(props) => props.theme.colors.defaultBackground};
    font-size: ${(props) => props.theme.sizes.defaultFont};

    .header {
        grid-column: 1 / span 2;
        grid-row: 1 / span 0;
    }

    .activitybar {
        grid-column: 1 / span 1;
        grid-row: 2 / span 1;
    }

    .dynamiclayout {
        grid-column: 2 / span 1;
        grid-row-start: 2 / span 1;
    }
`;

type Props = {
    onLogout: () => void;
    userAvatar?: string;
    brandSource: string;
};

const Layout = ({ userAvatar, onLogout, brandSource }: Props) => {
    const { t } = useTranslation();
    const [dockLayout, setDockLayout] = useState<DockLayout | null>(null);
    const modalRef = useRef();
    const activityBarShow = useRecoilValue(showActivityBar);
    const sidebarShow = useRecoilValue(showSidebar);

    const getRef = (ref: DockLayout) => {
        setDockLayout(ref);
    };

    // Use current modal reference
    const current = modalRef.current || null;

    const tabsRef =
        dockLayout &&
        current &&
        new AsTabs(
            dockLayout,
            defaultGroup,
            (current as ModalRef).setModalProps
        );

    const welcomeTab = {
        id: "welcome",
        title: createTabTitle(<Info />, t("Welcome")),
        content: <div className="p-2">{t("Perry")}</div>,
        closable: true,
        group: defaultGroup,
    };
    const activityList = activities(t);

    return (
        <Wrapper $leftColumnWidth={activityBarShow ? activitybarWidth : "0px"}>
            <TabsProvider tabsAPI={tabsRef}>
                <Suspense fallback={BasicLoading()}>
                    <Header
                        brandSource={brandSource}
                        brandHeight={brandHeight}
                        brandContainerWidth={activitybarWidth}
                        userAvatar={userAvatar}
                        userMenuHeight={userMenuHeight}
                        onLogout={onLogout}
                    />
                </Suspense>
                {activityBarShow ? (
                    <Suspense fallback={BasicLoading()}>
                        <Activitybar activities={activityList} />
                    </Suspense>
                ) : null}
                <Dynamic className="dynamiclayout">
                    {sidebarShow ? (
                        <Sidebar
                            width={"10%"}
                            minWidth={"100px"}
                            activities={activityList}
                        />
                    ) : null}
                    <DockLayout
                        ref={getRef}
                        defaultLayout={defaultLayoutData([welcomeTab])}
                        groups={groups}
                        style={{ width: "80%", minWidth: 100 }}
                    />
                </Dynamic>
                <ModalContainer ref={modalRef} />
            </TabsProvider>
        </Wrapper>
    );
};

export default Layout;
