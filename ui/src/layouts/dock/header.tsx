import React from "react";
import { Col, UncontrolledDropdown, DropdownToggle, Nav } from "reactstrap";
import { BasicMenu, BasicMenuItem } from "components";
import styled from "styled-components";
import { Lock, Globe, Check } from "icons";
import { useTranslation } from "react-i18next";
import { MenuBar } from "./menuBar";
import { showActivityBar, showSidebar } from "./state";
import { useRecoilState } from "recoil";

const StyledHeader = styled.div<{ $brandHeight: string }>`
    display: flex;
    justify-content: space-between;
    align-items: center;

    background-color: ${(props) => props.theme.colors.headerBackground};
    color: ${(props) => props.theme.colors.headerForeground};
    font-size: ${(props) => props.theme.sizes.defaultFont};

    .brand {
        padding: 0;
        height: ${(props) => props.$brandHeight};
    }
`;

const UserMenu = styled.img<{ $height: string }>`
    padding: 0;
    margin-right: 5px;
    height: ${(props) => props.$height};
    width: ${(props) => props.$height};
    border-radius: ${(props) => props.$height};
    border: solid 2px;
`;

export const LangHalf = styled(Col)`
    justify-content: center;
    color: ${(props) => props.theme.colors.defaultForeground} !important;
    &:hover {
        background-color: ${(props) =>
            props.theme.colors.defaultForeground} !important;
    }
`;

type Props = {
    brandSource: string;
    brandHeight: string;
    brandContainerWidth: string;
    userAvatar?: string;
    userMenuHeight: string;
    onLogout: () => void;
};

const Header = ({
    brandSource,
    brandHeight,
    brandContainerWidth,
    userAvatar,
    userMenuHeight,
    onLogout,
}: Props) => {
    const { t, i18n } = useTranslation();
    const other = i18n.language === "en-US" ? "de-DE" : "en-US";

    const [activityBarShow, setActivityBarShow] = useRecoilState(
        showActivityBar
    );
    const [sidebarShow, setSidebarShow] = useRecoilState(showSidebar);

    return (
        <StyledHeader className="header" $brandHeight={brandHeight}>
            <MenuBar
                brandContainerWidth={brandContainerWidth}
                brandSource={brandSource}
                items={[
                    {
                        key: "file",
                        title: t("File"),
                        items: [
                            {
                                key: "logout",
                                title: t("Logout"),
                                onClick: onLogout,
                            },
                        ],
                    },
                    {
                        key: "view",
                        title: "View",
                        items: [
                            {
                                key: "show-activitybar",
                                title: t("Show Activity Bar"),
                                icon: activityBarShow ? <Check /> : undefined,
                                onClick: () =>
                                    setActivityBarShow(!activityBarShow),
                            },
                            {
                                key: "show-sidebar",
                                title: t("Show Sidebar"),
                                icon: sidebarShow ? <Check /> : undefined,
                                onClick: () => setSidebarShow(!sidebarShow),
                            },
                        ],
                    }
                ]}
            />
            <span>
                <strong>PERRY</strong>
            </span>
            <Nav navbar>
                <UncontrolledDropdown nav direction="down">
                    <DropdownToggle className="p-0" nav>
                        <UserMenu
                            $height={userMenuHeight}
                            src={userAvatar}
                            alt="U"
                        />
                    </DropdownToggle>
                    <BasicMenu right size="sm">
                        <BasicMenuItem
                            onClick={() => i18n.changeLanguage(other)}
                        >
                            <Globe /> {t("Switch to")} {other}
                        </BasicMenuItem>
                        <BasicMenuItem onClick={onLogout}>
                            <Lock /> {t("Logout")}
                        </BasicMenuItem>
                    </BasicMenu>
                </UncontrolledDropdown>
            </Nav>
        </StyledHeader>
    );
};

export default Header;
