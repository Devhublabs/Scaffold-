import { useState } from "react";


function CoArtistPanel({ onGenerate, status }) {
  const [description, setDescription] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const value = description.trim();
    if (!value || status.state === "loading") return;
    await onGenerate(value);
  };

  return (
    <aside className="co-artist-panel">
      <div>
        <p className="panel-label">Co-Artist</p>
        <h2>Character guide</h2>
      </div>
      <form onSubmit={submit}>
        <label>
          Description
          <textarea
            value={description}
            maxLength="2000"
            rows="5"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Athletic shounen hero, 17, broad shoulders"
            required
          />
        </label>
        <button
          className="primary-button"
          type="submit"
          disabled={status.state === "loading"}
        >
          {status.state === "loading" ? "Building guide" : "Add guide"}
        </button>
      </form>
      {status.message && (
        <p
          className={
            status.state === "error" ? "form-error" : "panel-status"
          }
        >
          {status.message}
        </p>
      )}
    </aside>
  );
}

export default CoArtistPanel;
