"use client";

import * as React from "react";
import { AutoComplete, Input, Spin, theme as antdTheme } from "antd";
import { SearchOutlined, CheckOutlined } from "@ant-design/icons";
import { fetchSchemeList, type SchemeListItem } from "@/lib/data/mfapi";

const MAX_RESULTS = 50;

interface FundOption {
  value: string;
  key: string;
  label: React.ReactNode;
  scheme: SchemeListItem;
}

export function FundSearch({
  selected,
  onSelect,
  onClear,
}: {
  selected: SchemeListItem | null;
  onSelect: (scheme: SchemeListItem) => void;
  onClear?: () => void;
}) {
  const { token } = antdTheme.useToken();
  const [query, setQuery] = React.useState(selected?.schemeName ?? "");
  const [schemes, setSchemes] = React.useState<SchemeListItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setQuery(selected?.schemeName ?? "");
  }, [selected?.schemeCode]);

  function ensureLoaded() {
    if (schemes || loading) return;
    setLoading(true);
    setError(null);
    fetchSchemeList()
      .then((list) => setSchemes(list))
      .catch(() => setError("Couldn't reach the fund database. Check your connection and try again."))
      .finally(() => setLoading(false));
  }

  const options: FundOption[] = React.useMemo(() => {
    if (!schemes || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const matches: FundOption[] = [];
    for (const s of schemes) {
      if (s.schemeName.toLowerCase().includes(q)) {
        const isSelected = selected?.schemeCode === s.schemeCode;
        matches.push({
          value: s.schemeName,
          key: String(s.schemeCode),
          scheme: s,
          label: (
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <CheckOutlined style={{ fontSize: 12, visibility: isSelected ? "visible" : "hidden" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.schemeName}
              </span>
            </span>
          ),
        });
        if (matches.length >= MAX_RESULTS) break;
      }
    }
    return matches;
  }, [schemes, query, selected?.schemeCode]);

  function handleSelect(_value: string, option: FundOption) {
    setQuery(option.scheme.schemeName);
    onSelect(option.scheme);
  }

  function handleChange(value: string) {
    setQuery(value);
    if (value === "") onClear?.();
  }

  const mutedStyle: React.CSSProperties = {
    padding: "8px 4px",
    fontSize: 13,
    color: token.colorTextDescription,
  };

  const emptyMessage = loading ? (
    <div style={{ ...mutedStyle, display: "flex", alignItems: "center", gap: 8 }}>
      <Spin size="small" /> Loading the fund list…
    </div>
  ) : error ? (
    <div style={{ ...mutedStyle, color: token.colorError }}>{error}</div>
  ) : query.trim().length < 2 ? (
    <div style={mutedStyle}>Type at least 2 characters to search.</div>
  ) : (
    <div style={mutedStyle}>No matching funds.</div>
  );

  return (
    <AutoComplete<string, FundOption>
      style={{ width: "100%" }}
      value={query}
      options={options}
      notFoundContent={emptyMessage}
      onFocus={ensureLoaded}
      onChange={handleChange}
      onSelect={handleSelect}
      onClear={() => onClear?.()}
      allowClear
      defaultActiveFirstOption
      popupMatchSelectWidth
      listHeight={288}
    >
      <Input prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />} placeholder="Search for a mutual fund" />
    </AutoComplete>
  );
}