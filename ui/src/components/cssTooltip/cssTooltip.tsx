import styled from "styled-components";

/**
 * Simple text tooltip as a div using styled components.
 *
 * @param margin - margin dimensions in the CSS order: top right bottom left.
 * @param attribute - HTML attribute from which the tooltip text is grabbed.
 */
export const TooltipDiv = styled.div<{ $margin: string; $attribute: string }>`
    [data-tooltip]:before {
        content: attr(${(props) => props.$attribute});
        position: absolute;
        opacity: 0;
        visibility: hidden;
        padding: 5px;

        background-color: ${(props) => props.theme.colors.tooltipBackground};
        color: ${(props) => props.theme.colors.defaultForeground};
        border: solid 1px ${(props) => props.theme.colors.tooltipBorder};
    }

    [data-tooltip]:hover:before {
        visibility: visible;
        opacity: 1;

        background-color: ${(props) => props.theme.colors.tooltipBackground};
        margin: ${(props) => props.$margin};
        z-index: 2;
        font-size: 90%;
        font-style: normal;
        white-space: nowrap;
    }
`;
