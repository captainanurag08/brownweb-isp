import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../state/store';
import { Icon } from '../icons/Icon';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string | null;
  folder_id?: string | null;
}

interface BulkBookmark {
  title: string;
  url: string;
}

interface BulkImportResponse {
  bookmarks: Bookmark[];
  count: number;
}

export function BookmarksApp() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const [search, setSearch] = useState('');

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  const { setCurrentApp, newTab } = useStore();

  async function load() {
    try {
      const data = await api.get<{ bookmarks: Bookmark[] }>('/bookmarks');
      setBookmarks(data.bookmarks);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !url.trim()) {
      return;
    }

    try {
      let finalUrl = url.trim();

      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
      }

      await api.post('/bookmarks', {
        title: title.trim(),
        url: finalUrl,
      });

      setTitle('');
      setUrl('');
      await load();
    } catch (err) {
      console.error('Failed to add bookmark:', err);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/bookmarks/${id}`);
      await load();
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  }

  function open(urlToOpen: string) {
    setCurrentApp('browser');
    newTab(urlToOpen);
  }

  function generateTitle(urlString: string): string {
    try {
      const parsed = new URL(urlString);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return urlString;
    }
  }

  function parseBulkText(text: string): BulkBookmark[] {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const result: BulkBookmark[] = [];

    for (const line of lines) {
      let bookmarkTitle = '';
      let bookmarkUrl = '';

      const separator = line.indexOf('|');

      if (separator >= 0) {
        bookmarkTitle = line.slice(0, separator).trim();
        bookmarkUrl = line.slice(separator + 1).trim();
      } else {
        bookmarkUrl = line;
        bookmarkTitle = generateTitle(bookmarkUrl);
      }

      if (!bookmarkUrl) {
        continue;
      }

      if (!/^https?:\/\//i.test(bookmarkUrl)) {
        bookmarkUrl = `https://${bookmarkUrl}`;
      }

      try {
        new URL(bookmarkUrl);

        if (!bookmarkTitle) {
          bookmarkTitle = generateTitle(bookmarkUrl);
        }

        result.push({
          title: bookmarkTitle,
          url: bookmarkUrl,
        });
      } catch {
        continue;
      }
    }

    return result;
  }

  const parsedBulk = parseBulkText(bulkText);

  const filteredBookmarks = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return bookmarks;
    }

    return bookmarks.filter((bookmark) => {
      return (
        bookmark.title.toLowerCase().includes(searchTerm) ||
        bookmark.url.toLowerCase().includes(searchTerm)
      );
    });
  }, [bookmarks, search]);

  async function importBookmarks() {
    setImportMessage('');
    setImportError('');

    if (parsedBulk.length === 0) {
      setImportError('No valid bookmarks found.');
      return;
    }

    if (parsedBulk.length > 500) {
      setImportError('Maximum 500 bookmarks can be imported at once.');
      return;
    }

    setImporting(true);

    try {
      const result = await api.post<BulkImportResponse>(
        '/bookmarks/bulk',
        {
          bookmarks: parsedBulk,
        }
      );

      setImportMessage(
        result.count === 1
          ? '1 bookmark imported successfully.'
          : `${result.count} bookmarks imported successfully.`
      );

      setBulkText('');
      await load();

      window.setTimeout(() => {
        setImportMessage('');
      }, 4000);
    } catch (err) {
      console.error('Bulk bookmark import failed:', err);

      setImportError(
        'Import failed. Make sure the backend bulk bookmark endpoint is deployed.'
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Bookmarks
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            Save and organize pages you want to revisit.
          </div>
        </div>

        <button
          className="btn"
          type="button"
          onClick={() => {
            setShowBulkImport(!showBulkImport);
            setImportMessage('');
            setImportError('');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name="plus" size={14} />
          {showBulkImport ? 'Close Import' : 'Bulk Import'}
        </button>
      </div>

      {/* SEARCH BAR */}
      <div
        style={{
          position: 'relative',
          marginTop: 18,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        >
          <Icon name="search" size={15} />
        </div>

        <input
          className="field"
          type="search"
          placeholder="Search bookmarks by title or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            paddingLeft: 36,
            paddingRight: search ? 38 : 12,
          }}
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            title="Clear search"
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              padding: 4,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* ADD BOOKMARK */}
      <form
        onSubmit={add}
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 10,
          flexWrap: 'wrap',
        }}
      >
        <input
          className="field"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            flex: '1 1 180px',
            minWidth: 0,
          }}
        />

        <input
          className="field"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            flex: '2 1 280px',
            minWidth: 0,
          }}
        />

        <button className="btn btn-primary" type="submit">
          <Icon name="plus" size={14} />
        </button>
      </form>

      {/* BULK IMPORT */}
      {showBulkImport && (
        <div
          className="panel"
          style={{
            marginTop: 18,
            padding: 18,
            borderRadius: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Bulk Import
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                Paste multiple bookmarks at once, one bookmark per line.
              </div>
            </div>

            <div
              style={{
                padding: '5px 9px',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--text-muted)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}
            >
              {parsedBulk.length}/500 ready
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: 11,
              lineHeight: 1.7,
              color: 'var(--text-muted)',
            }}
          >
            <div
              style={{
                color: 'var(--text)',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Supported format
            </div>

            <div className="mono">
              Google | https://google.com
            </div>

            <div style={{ marginTop: 3 }}>
              You can also paste a URL by itself. Its domain becomes the title.
            </div>
          </div>

          <textarea
            className="field"
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
              setImportMessage('');
              setImportError('');
            }}
            placeholder="Google | https://www.google.com&#10;YouTube | https://www.youtube.com&#10;GitHub | https://github.com&#10;Wikipedia | https://www.wikipedia.org&#10;&#10;Or paste URLs, one per line."
            style={{
              width: '100%',
              minHeight: 190,
              marginTop: 12,
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          />

          {importMessage && (
            <div
              style={{
                marginTop: 10,
                padding: '9px 11px',
                borderRadius: 9,
                fontSize: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              {importMessage}
            </div>
          )}

          {importError && (
            <div
              style={{
                marginTop: 10,
                padding: '9px 11px',
                borderRadius: 9,
                fontSize: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              {importError}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              {parsedBulk.length > 0
                ? `${parsedBulk.length} valid bookmark${
                    parsedBulk.length === 1 ? '' : 's'
                  } detected`
                : 'Nothing ready to import'}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
              }}
            >
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setBulkText('');
                  setImportMessage('');
                  setImportError('');
                }}
                disabled={importing || bulkText.length === 0}
              >
                Clear
              </button>

              <button
                className="btn btn-primary"
                type="button"
                onClick={importBookmarks}
                disabled={importing || parsedBulk.length === 0}
                style={{
                  minWidth: 120,
                }}
              >
                {importing
                  ? 'Importing...'
                  : `Import ${parsedBulk.length || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKMARK COUNT */}
      {bookmarks.length > 0 && (
        <div
          style={{
            marginTop: 20,
            marginBottom: 8,
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          {search
            ? `${filteredBookmarks.length} of ${bookmarks.length} bookmarks`
            : `${bookmarks.length} bookmark${
                bookmarks.length === 1 ? '' : 's'
              }`}
        </div>
      )}

      {/* BOOKMARK LIST */}
      {bookmarks.length === 0 ? (
        <div className="empty-state">
          <strong>No bookmarks yet</strong>
          <span>
            Save pages here so you can get back to them quickly.
          </span>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="empty-state">
          <strong>No matching bookmarks</strong>
          <span>
            Try a different title, website name, or URL.
          </span>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="panel"
              style={{
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Icon name="star" size={15} />

              <button
                type="button"
                onClick={() => open(bookmark.url)}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {bookmark.title}
                </div>

                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {bookmark.url}
                </div>
              </button>

              <button
                type="button"
                onClick={() => remove(bookmark.id)}
                style={{
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
                title="Delete bookmark"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
