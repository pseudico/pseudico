import { DownloadCloud, Edit3, ExternalLink, Monitor } from "lucide-react";
import { useState } from "react";
import {
  LinkEditor,
  type LinkEditorValues
} from "../forms/LinkEditor";
import type { UniversalItemViewModel } from "./ItemCard";
import { WebWidget } from "./widgets/WebWidget";

export type LinkCardViewModel = UniversalItemViewModel & {
  id: string;
  type: "link";
  title: string;
  url: string;
  normalizedUrl: string;
  linkTitle?: string | null;
  description?: string | null;
  domain?: string | null;
  faviconPath?: string | null;
  previewImagePath?: string | null;
  renderAsWidget?: boolean;
  widgetHeight?: number;
  widgetWarningAcceptedAt?: string | null;
};

export type LinkWidgetSettingsPatch = {
  renderAsWidget?: boolean;
  widgetHeight?: number;
};

export type LinkCardContentProps = {
  disabled?: boolean;
  error?: string | null;
  item: LinkCardViewModel;
  webWidgetsEnabled?: boolean;
  onOpen: (item: LinkCardViewModel) => void;
  onFetchMetadata?: (item: LinkCardViewModel) => void;
  onSave: (
    item: LinkCardViewModel,
    values: LinkEditorValues
  ) => boolean | Promise<boolean>;
  onUpdateWidgetSettings?: (
    item: LinkCardViewModel,
    settings: LinkWidgetSettingsPatch
  ) => void;
};

export function LinkCardContent({
  disabled = false,
  error = null,
  item,
  webWidgetsEnabled = false,
  onFetchMetadata,
  onOpen,
  onSave,
  onUpdateWidgetSettings
}: LinkCardContentProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  async function handleSave(values: LinkEditorValues): Promise<boolean> {
    const saved = await onSave(item, values);

    if (saved) {
      setEditing(false);
    }

    return saved;
  }

  if (editing) {
    return (
      <LinkEditor
        disabled={disabled}
        error={error}
        initialValues={{
          url: item.normalizedUrl,
          title: item.title,
          description: item.description ?? item.body ?? ""
        }}
        onCancel={() => setEditing(false)}
        onSubmit={handleSave}
      />
    );
  }

  return (
    <div className="link-card-content">
      {item.renderAsWidget === true ? (
        <WebWidget
          height={item.widgetHeight ?? 360}
          networkEnabled={webWidgetsEnabled}
          title={item.title}
          url={item.normalizedUrl}
          onOpenExternal={() => onOpen(item)}
        />
      ) : null}
      {item.description === null ||
      item.description === undefined ||
      item.description.trim().length === 0 ? null : (
        <p>{item.description}</p>
      )}
      {item.previewImagePath === null ||
      item.previewImagePath === undefined ||
      item.previewImagePath.trim().length === 0 ? null : (
        <div className="link-card-preview" aria-label="Cached preview image">
          <span className="link-card-preview-label">Preview image</span>
          <code>{item.previewImagePath}</code>
        </div>
      )}
      <dl className="link-card-details">
        <div>
          <dt>Domain</dt>
          <dd>{item.domain ?? "Unknown"}</dd>
        </div>
        {item.faviconPath === null ||
        item.faviconPath === undefined ||
        item.faviconPath.trim().length === 0 ? null : (
          <div>
            <dt>Favicon</dt>
            <dd>{item.faviconPath}</dd>
          </div>
        )}
        <div>
          <dt>URL</dt>
          <dd>{item.normalizedUrl}</dd>
        </div>
      </dl>
      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}
      {onUpdateWidgetSettings === undefined ? null : (
        <LinkWidgetControls
          disabled={disabled}
          item={item}
          onUpdateWidgetSettings={onUpdateWidgetSettings}
        />
      )}
      <div className="link-card-actions">
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          title="Open link"
          type="button"
          onClick={() => onOpen(item)}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open
        </button>
        {onFetchMetadata === undefined ? null : (
          <button
            className="secondary-button compact-button"
            disabled={disabled}
            title="Fetch link metadata"
            type="button"
            onClick={() => onFetchMetadata(item)}
          >
            <DownloadCloud size={16} aria-hidden="true" />
            Fetch metadata
          </button>
        )}
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          title="Edit link metadata"
          type="button"
          onClick={() => setEditing(true)}
        >
          <Edit3 size={16} aria-hidden="true" />
          Edit
        </button>
      </div>
    </div>
  );
}

type LinkWidgetControlsProps = {
  disabled: boolean;
  item: LinkCardViewModel;
  onUpdateWidgetSettings: (
    item: LinkCardViewModel,
    settings: LinkWidgetSettingsPatch
  ) => void;
};

function LinkWidgetControls({
  disabled,
  item,
  onUpdateWidgetSettings
}: LinkWidgetControlsProps): React.JSX.Element {
  const renderAsWidget = item.renderAsWidget === true;

  return (
    <div className="link-widget-controls">
      {renderAsWidget ? (
        <>
          <label>
            Widget size
            <select
              disabled={disabled}
              value={item.widgetHeight ?? 360}
              onChange={(event) =>
                onUpdateWidgetSettings(item, {
                  widgetHeight: Number(event.target.value)
                })
              }
            >
              <option value={240}>Compact</option>
              <option value={360}>Standard</option>
              <option value={520}>Tall</option>
            </select>
          </label>
          <button
            className="secondary-button compact-button"
            disabled={disabled}
            type="button"
            onClick={() =>
              onUpdateWidgetSettings(item, { renderAsWidget: false })
            }
          >
            <Monitor size={16} aria-hidden="true" />
            Show as card
          </button>
        </>
      ) : (
        <>
          {item.widgetWarningAcceptedAt === null ||
          item.widgetWarningAcceptedAt === undefined ? (
            <p className="form-message">
              Web widgets load remote pages inside a sandboxed frame. Enable
              only for links you trust.
            </p>
          ) : null}
          <button
            className="secondary-button compact-button"
            disabled={disabled}
            type="button"
            onClick={() =>
              onUpdateWidgetSettings(item, { renderAsWidget: true })
            }
          >
            <Monitor size={16} aria-hidden="true" />
            Enable widget
          </button>
        </>
      )}
    </div>
  );
}
