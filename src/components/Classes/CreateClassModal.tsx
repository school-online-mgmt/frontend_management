import {useState} from "react";
import api from "../../api/api";
import ConfirmModal from "../common/ConfirmModal";
const CreateClassModal = ({ onClose, onSuccess }: any) => {

    const [slug, setSlug] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);


    const handleCreate = async () => {

        setLoading(true);

        try {
            const payload: any = { slug, name };

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
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="Slug"
                className="w-full border rounded-lg p-2"
            />

            <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Class"
                className="w-full border rounded-lg p-2"
            />
        </ConfirmModal>

    );
};

export default CreateClassModal;