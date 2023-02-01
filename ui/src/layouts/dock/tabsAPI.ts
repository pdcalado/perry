import DockLayout, { TabData } from "rc-dock";
import { BasicModalProps } from "components";

export type SetModalProps = (props: BasicModalProps) => void;

class AsTabs {
    readonly layoutRef: DockLayout;
    readonly groupId: string;
    readonly setModalProps: SetModalProps;

    constructor(
        layoutRef: DockLayout,
        groupId: string,
        setModalProps: SetModalProps
    ) {
        this.layoutRef = layoutRef;
        this.groupId = groupId;
        this.setModalProps = setModalProps;
    }

    createNew = (tab: TabData) => {
        let obj = { ...tab, group: this.groupId };
        this.layoutRef.dockMove(obj, "default", "middle");
    };

    createIfNotExists = (tab: TabData) => {
        if (tab.id && this.layoutRef.find(tab.id)) return;

        let obj = { ...tab, group: this.groupId };
        this.layoutRef.dockMove(obj, "default", "middle");
    };

    replaceIfExists = (tab: TabData) => {
        if (!tab.id) return;

        let obj = { ...tab, group: this.groupId };

        if (this.layoutRef.find(tab.id)) {
            this.layoutRef.updateTab(tab.id, obj);
        } else {
            this.layoutRef.dockMove(obj, "default", "middle");
        }
    };

    close = (id: string) => {
        return;
    };

    openModal = (props: Partial<BasicModalProps>) => {
        this.setModalProps({
            ...props,
            isOpen: true,
            toggle: () =>
                this.setModalProps({ isOpen: false, toggle: () => {} }),
        });
    };

    closeModal = () => {
        this.setModalProps({
            isOpen: false,
            toggle: () => {},
        });
    };
}

export default AsTabs;
