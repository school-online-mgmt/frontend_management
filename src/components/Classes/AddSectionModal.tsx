import {useState} from "react";
import api from "../../api/api";
import ConfirmModal from "../common/ConfirmModal";

const AddSectionModal = ({ classId, onClose, onSuccess }: any) => {

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {

    setLoading(true);

    try {
      const payload: any = {name, slug};

      const res = await api.createSection(classId, payload);

      onSuccess({
        type: "success",
        text: res.message
      });

      onClose();

    } catch (err: any) {

      onSuccess({
        type: "error",
        text: err?.response?.data?.message || "Failed to add section"
      });

      onClose();

    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmModal
      title="Enter section details"
      confirmText="Add Section"
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
        placeholder="Section Name"
        className="w-full border rounded-lg p-2"
      />

    </ConfirmModal>
  );
};

export default AddSectionModal;