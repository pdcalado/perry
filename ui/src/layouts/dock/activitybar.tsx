import React from "react";
import styled from "styled-components";
import { Nav } from "reactstrap";
import { ActivityConfig, Link } from "_activities_config";
import { TooltipDiv } from "components";

const StyledActivitybar = styled(TooltipDiv)`
    background-color: ${(props) => props.theme.colors.activitybarBackground};
    color: ${(props) => props.theme.colors.activitybarForeground};

    .activitybar-nav {
        display: flex;
        flex-direction: column;
        justify-content: center;

        .activitybar-navlink {
            padding-left: 12px;
            border-left: solid 2px
                ${(props) => props.theme.colors.activitybarIconHover}00;
        }

        .active {
            border-left: solid 2px
                ${(props) => props.theme.colors.activitybarIconHover}ff;
            color: ${(props) => props.theme.colors.activitybarIconHover};
        }

        a {
            outline: 0;
            color: ${(props) => props.theme.colors.activitybarForeground};
        }

        a:hover {
            color: ${(props) => props.theme.colors.activitybarIconHover};
        }
    }

    .nav {
        flex-wrap: nowrap;
    }

    [data-tooltip]:hover:before {
        transition: opacity 0s linear 0.5s;
    }
`;

type Props = {
    activities: ActivityConfig[];
    onChangeActivity?: (activity: string) => void;
};

const Activitybar: React.FC<Props> = ({ activities, onChangeActivity }) => (
    <StyledActivitybar
        className="activitybar"
        $margin="15px 0 0 25px"
        $attribute="data-tooltip"
    >
        <Nav className="activitybar-nav">
            {activities.map((item, index) => (
                <Link
                    key={index}
                    to={item.urlPath}
                    className={"nav-link activitybar-navlink"}
                    data-tooltip={item.name}
                >
                    {item.icon}
                </Link>
            ))}
        </Nav>
    </StyledActivitybar>
);

export default Activitybar;
