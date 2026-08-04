import {useState} from "react";
import api from "../../api/api";
import ConfirmModal from "../common/ConfirmModal";

interface CreateClassModalProps {
    /** The session this class will be created under — required, since classes
        are session-scoped. Provided by the parent Classes & Sections page. */
    sessionId: string;
    onClose: () => void;
    onSuccess: (msg: { type: "success" | "error"; text: string }) => void;
}

const CreateClassModal = ({ sessionId, onClose, onSuccess }: CreateClassModalProps) => {

    const [slug, setSlug] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);


    const handleCreate = async () => {

        setLoading(true);

        try {
            const payload = { sessionId, slug, name };

            const res = await api.createClass(payload);
            onSuccess({
                type: "success",
                text: res.message
            });
            onClose();

        } catch (err: any) {
            onSuccess({
                type: "error",
                text: err?.response?.data?.message || "Failed to create class"
            });
            onClose();

        } finally {
            setLoading(false);
        }
    };

    return (
        <ConfirmModal
            title="Enter class details"
            confirmText="Create"
            loading={loading}
            onConfirm={handleCreate}
            onCancel={onClose}
        >
            <input
                data-testid="class-slug-input"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="Slug"
                className="w-full border rounded-lg p-2"
            />

            <input
                data-testid="class-name-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Class Name"
                className="w-full border rounded-lg p-2"
            />
        </ConfirmModal>

    );
};

export default CreateClassModal;