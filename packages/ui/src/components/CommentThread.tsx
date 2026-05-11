import { useState } from "react";

export type CommentThreadComment = {
  id: string;
  body: string;
  authorLabel?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  editedAt?: string | null;
};

export type CommentThreadProps = {
  comments: readonly CommentThreadComment[];
  busy?: boolean;
  error?: string | null;
  onAddComment?: (body: string) => void | Promise<void>;
  onUpdateComment?: (commentId: string, body: string) => void | Promise<void>;
  onDeleteComment?: (commentId: string) => void | Promise<void>;
};

export function CommentThread({
  busy = false,
  comments,
  error = null,
  onAddComment,
  onDeleteComment,
  onUpdateComment
}: CommentThreadProps): React.JSX.Element {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  return (
    <section className="comment-thread" aria-label="Comments">
      <div className="comment-thread-header">
        <h4>Comments</h4>
        <span className="muted-text">{comments.length} local annotation{comments.length === 1 ? "" : "s"}</span>
      </div>
      {error === null ? null : <p className="form-message form-message-error">{error}</p>}
      {comments.length === 0 ? (
        <p className="muted-text">No comments recorded yet.</p>
      ) : (
        <ul className="inspector-simple-list comment-thread-list">
          {comments.map((comment) => {
            const isEditing = editingId === comment.id;

            return (
              <li key={comment.id}>
                <strong>{comment.authorLabel ?? "Local user"}</strong>
                {isEditing ? (
                  <form
                    className="comment-thread-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const nextBody = editingBody.trim();
                      if (nextBody.length === 0) {
                        return;
                      }
                      void Promise.resolve(onUpdateComment?.(comment.id, nextBody)).then(() => {
                        setEditingId(null);
                        setEditingBody("");
                      });
                    }}
                  >
                    <textarea
                      aria-label="Edit comment"
                      disabled={busy}
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.target.value)}
                    />
                    <div className="comment-thread-actions">
                      <button
                        className="secondary-button compact-button"
                        disabled={busy || editingBody.trim().length === 0}
                        type="submit"
                      >
                        Save
                      </button>
                      <button
                        className="secondary-button compact-button"
                        disabled={busy}
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingBody("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span>{comment.body}</span>
                    <time dateTime={comment.createdAt}>
                      {comment.createdAt}
                      {comment.editedAt === null || comment.editedAt === undefined ? "" : " (edited)"}
                    </time>
                    <div className="comment-thread-actions">
                      {onUpdateComment === undefined ? null : (
                        <button
                          className="secondary-button compact-button"
                          disabled={busy}
                          type="button"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditingBody(comment.body);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {onDeleteComment === undefined ? null : (
                        <button
                          className="secondary-button compact-button"
                          disabled={busy}
                          type="button"
                          onClick={() => void onDeleteComment(comment.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {onAddComment === undefined ? null : (
        <form
          className="comment-thread-form"
          onSubmit={(event) => {
            event.preventDefault();
            const body = draft.trim();
            if (body.length === 0) {
              return;
            }
            void Promise.resolve(onAddComment(body)).then(() => setDraft(""));
          }}
        >
          <label className="inspector-field">
            <span>Add comment</span>
            <textarea
              disabled={busy}
              placeholder="Add a local annotation..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button
            className="secondary-button compact-button"
            disabled={busy || draft.trim().length === 0}
            type="submit"
          >
            Add comment
          </button>
        </form>
      )}
    </section>
  );
}
