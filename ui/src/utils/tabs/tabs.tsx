import React, { ComponentType, Suspense, useContext } from "react";
import { TabData } from "rc-dock";
import { BasicLoading, BasicModalProps } from "components";
import styled from "styled-components";

export interface TabsAPI {
    createNew: (tab: TabData) => void;
    createIfNotExists: (tab: TabData) => void;
    replaceIfExists: (tab: TabData) => void;
    close: (id: string) => void;
    openModal: (props: Partial<BasicModalProps>) => void;
    closeModal: () => void;
}

export type Tab = TabData;

const StyledSpan = styled.span<{ $color?: string }>`
    svg {
        margin-right: 5px;
        color: ${(props) => props.$color || props.theme.colors.info};
    }
`;

export const createTabTitle = (
    icon: React.ReactChild,
    text: string,
    iconColor?: string
): React.ReactChild => (
    <StyledSpan $color={iconColor}>
        {icon} {text}
    </StyledSpan>
);

export const createLazyTab = <T extends ComponentType<any>>(
    id: string,
    title: React.ReactChild,
    factory: () => Promise<{ default: T }>,
    props: any = undefined
): TabData => {
    const Comp = React.lazy(factory);

    return {
        id,
        title,
        closable: true,
        content: (
            <Suspense fallback={BasicLoading()}>
                <Comp {...props} />
            </Suspense>
        ),
    };
};

export const createJsxTab = (
    id: string,
    title: string,
    factory: (_: any) => JSX.Element,
    props: any = undefined
): TabData => {
    return {
        id,
        title,
        closable: true,
        content: (
            <Suspense fallback={BasicLoading()}>{factory(props)}</Suspense>
        ),
    };
};

type ContextProps = {
    tabsAPI: TabsAPI;
};

const TabsContext = React.createContext<ContextProps | null>(null);

export const useTabs = () => useContext(TabsContext)!;

type ProviderProps = {
    tabsAPI: TabsAPI | null;
};

export const TabsProvider: React.FC<ProviderProps> = ({
    children,
    tabsAPI,
}) => {
    if (!tabsAPI) return <React.Fragment>{children}</React.Fragment>;

    return (
        <TabsContext.Provider
            value={{
                tabsAPI,
            }}
        >
            {children}
        </TabsContext.Provider>
    );
};
