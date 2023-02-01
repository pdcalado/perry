import React from "react";
import {
    FontAwesomeIcon,
    FontAwesomeIconProps,
} from "@fortawesome/react-fontawesome";
import {
    faAngleRight,
    faAngleDown,
    faCaretDown,
    faCaretRight,
    faCircleNotch,
    faCheck,
    faCheckCircle,
    faCog,
    faCube,
    faCubes,
    faDollyFlatbed,
    faDownload,
    faEdit,
    faExclamationTriangle,
    faGlobe,
    faInbox,
    faIndustry,
    faInfo,
    faInfoCircle,
    faLifeRing,
    faLink,
    faListUl,
    faLock,
    faMapMarker,
    faMinus,
    faPaintBrush,
    faPenSquare,
    faPlusCircle,
    faPlus,
    faSearch,
    faSitemap,
    faTag,
    faTags,
    faThList,
    faTimes,
    faTimesCircle,
    faTrashAlt,
    faSignInAlt,
    faUpload,
    faWarehouse,
} from "@fortawesome/free-solid-svg-icons";

type Subset = Partial<FontAwesomeIconProps> | undefined;
type Icon = React.FC<Subset>;
const FAI: Icon = (props, icon) => <FontAwesomeIcon {...props} icon={icon} />;

export const Search: Icon = (props) => FAI(props, faSearch);
export const PaintBrush: Icon = (props) => FAI(props, faPaintBrush);
export const Cog: Icon = (props) => FAI(props, faCog);
export const Edit: Icon = (props) => FAI(props, faEdit);
export const Link: Icon = (props) => FAI(props, faLink);
export const LifeRing: Icon = (props) => FAI(props, faLifeRing);
export const CircleNotch: Icon = (props) => FAI(props, faCircleNotch);
export const CaretDown: Icon = (props) => FAI(props, faCaretDown);
export const CaretRight: Icon = (props) => FAI(props, faCaretRight);
export const Cubes: Icon = (props) => FAI(props, faCubes);
export const Cube: Icon = (props) => FAI(props, faCube);
export const Tag: Icon = (props) => FAI(props, faTag);
export const Tags: Icon = (props) => FAI(props, faTags);
export const ListUl: Icon = (props) => FAI(props, faListUl);
export const Lock: Icon = (props) => FAI(props, faLock);
export const PlusCircle: Icon = (props) => FAI(props, faPlusCircle);
export const TrashAlt: Icon = (props) => FAI(props, faTrashAlt);
export const DropHere: Icon = (props) =>
    FAI({ ...props, transform: { rotate: 90 } }, faSignInAlt);
export const Globe: Icon = (props) => FAI(props, faGlobe);
export const DollyFlatbed: Icon = (props) => FAI(props, faDollyFlatbed);
export const Info: Icon = (props) => FAI(props, faInfo);
export const InfoCircle: Icon = (props) => FAI(props, faInfoCircle);
export const Sitemap: Icon = (props) => FAI(props, faSitemap);
export const Warehouse: Icon = (props) => FAI(props, faWarehouse);
export const MapMarker: Icon = (props) => FAI(props, faMapMarker);
export const Inbox: Icon = (props) => FAI(props, faInbox);
export const Plus: Icon = (props) => FAI(props, faPlus);
export const Minus: Icon = (props) => FAI(props, faMinus);
export const AngleDown: Icon = (props) => FAI(props, faAngleDown);
export const AngleRight: Icon = (props) => FAI(props, faAngleRight);
export const Industry: Icon = (props) => FAI(props, faIndustry);
export const ThList: Icon = (props) => FAI(props, faThList);
export const Times: Icon = (props) => FAI(props, faTimes);
export const TimesCircle: Icon = (props) => FAI(props, faTimesCircle);
export const CheckCircle: Icon = (props) => FAI(props, faCheckCircle);
export const Check: Icon = (props) => FAI(props, faCheck);
export const ExclamationTriangle: Icon = (props) =>
    FAI(props, faExclamationTriangle);
export const Download: Icon = (props) => FAI(props, faDownload);
export const Upload: Icon = (props) => FAI(props, faUpload);
export const PenSquare: Icon = (props) => FAI(props, faPenSquare);
