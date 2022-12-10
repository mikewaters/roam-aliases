import {
  Classes,
  Button,
  ButtonGroup,
  Checkbox,
  Icon,
  Popover,
  Menu,
  MenuItem,
  FormGroup,
  ControlGroup,
} from "@blueprintjs/core";
import React, { FC, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { PullBlock } from "roamjs-components/types";
import { BreadcrumbsBlock } from "./breadcrumbs-block";
import {
  readConfigFromUid,
  resetConfigByUid,
  saveConfigByUid,
} from "./config-settings";
import { extension_helper, keys, onRouteChange } from "./helper";
import { roam, roamAliases } from "./roam";
import { AliasesBlock } from "./type";

const isPage = (block: PullBlock) => {
  return !!block[":node/title"];
};

const EL_CLASS = "rm-unlink-aliases";
const unmount = () => {
  const roamArticle = document.querySelector(".roam-article") as HTMLDivElement;
  const div = roamArticle.querySelector(`.${EL_CLASS}`);
  if (div) {
    roamArticle.removeChild(div);
  }
};

const mountEl = () => {
  const div = document.createElement("div");
  div.className = EL_CLASS;
  const roamArticle = document.querySelector(".roam-article") as HTMLDivElement;
  roamArticle.appendChild(div);
  return div;
};

const getAllAliasesFromPageUid = (uid: string) => {
  const aliasesForCurrentPage = roamAliases.page(uid);
  const aliases = aliasesForCurrentPage
    .map((item) => item[0])
    .reduce((p, c) => {
      return Array.from(new Set([...p, ...c]));
    }, [] as string[]);
  const aliasesBlockUids = aliasesForCurrentPage.map((item) => item[1]);
  return [aliases, aliasesBlockUids] as const;
};

const aliasesFilter = (alias: string, source: string) => {
  // 不包含 `[[alias]]` 也不包括 `[alias]([[]])` 后, 还包含 alias
  const includes = source.includes(alias);
  if (!includes) {
    return false;
  }

  const aliasReference = new RegExp(
    `\[(${alias})\]\(\[\[[\w\-]{9}\]\]\)`,
    "gi"
  );

  const pageRererence = new RegExp(`\[\[${alias}\]\]`, "gi");
  //   console.log(source, alias, "---@");
  return source
    .replaceAll(aliasReference, "__")
    .replaceAll(pageRererence, "__")
    .includes(alias);
  //   return true;
};

const dedupPullBlocks = (blocks: PullBlock[]) => {};

const getPageGroupAllUnlinnkReferenceFromAliases = <T extends string>(
  //   exceptUids: string[],
  allblocksAndPages: AliasesBlock[],
  aliases: T[],
  caseSensive = true
) => {
  //   console.log(allblocksAndPages, "@-", exceptUids);
  const filtered = allblocksAndPages.reduce((p, bp) => {
    const s = bp[":block/string"] || bp[":node/title"] || "";

    aliases.forEach((alias) => {
      if (aliasesFilter(alias, s)) {
        //   bp.aliases =
        if (!bp.aliases) {
          bp.aliases = new Set([alias]);
        } else {
          bp.aliases.add(alias);
        }
        const id = (
          bp[":node/title"] ? bp[":db/id"] : bp[":block/page"][":db/id"] + ""
        ) as T;
        if (!p[id]) {
          p[id] = new Set([bp]);
        } else {
          p[id].add(bp);
        }
      }
    });
    return p;
  }, new Set() as Record<T, Set<AliasesBlock>>);
  return keys(filtered).reduce((p, c) => {
    p[c] = [...filtered[c]];
    return p;
  }, {} as Record<T, AliasesBlock[]>);
};

const getGroupAllUnlinkReferenceFromAliases = <T extends string>(
  //   exceptUids: string[],
  allblocksAndPages: AliasesBlock[],
  aliases: T[],
  caseSensive = true
) => {
  //   console.log(allblocksAndPages, "@-", exceptUids);
  const filtered = allblocksAndPages.reduce((p, bp) => {
    const s = bp[":block/string"] || bp[":node/title"] || "";
    aliases.forEach((alias) => {
      if (aliasesFilter(alias, s)) {
        if (!bp.aliases) {
          bp.aliases = new Set([alias]);
        } else {
          bp.aliases.add(alias);
        }
        if (!p[alias]) {
          p[alias] = [bp];
        } else {
          p[alias].push(bp);
        }
      }
    });
    return p;
  }, {} as Record<T, AliasesBlock[]>);
  return filtered;
};

const useTablePagination = (config: { max: number; size: number }) => {
  const [state, _setState] = useState({
    size: config.size,
    index: 0,
  });
  const setState = (partialState: Partial<typeof state>) => {
    _setState((prev) => {
      return {
        ...prev,
        ...partialState,
      };
    });
  };
  const pages = Math.ceil(config.max / state.size);
  return {
    state,
    next() {
      setState({ index: state.index + 1 });
    },
    prev() {
      setState({ index: state.index - 1 });
    },
    hasNext() {
      return pages - 1 > state.index;
    },
    hasPrev() {
      return state.index !== 0;
    },
    setSize(size: number) {
      setState({ size, index: 0 });
    },
    pages,
    pagination: {
      start: state.index * state.size,
      end: (state.index + 1) * state.size,
    },
  };
};

const TablePagination = (props: ReturnType<typeof useTablePagination>) => {
  return (
    <div className="flex-reverse-row pagination">
      <div className={Classes.SELECT}>
        <select
          onChange={(e) => props.setSize(+e.target.value)}
          value={props.state.size + ""}
        >
          <option value={"20"}>20 / Page</option>
          <option value={"10"}>10 / Page</option>
          <option value={"5"}>5 / Page </option>
          <option value={"1"}>1 / Page</option>
        </select>
      </div>
      <div style={{ width: 20 }} />
      <ButtonGroup>
        {/* <Button icon="double-chevron-left" minimal /> */}
        <Button
          icon="arrow-left"
          minimal
          disabled={!props.hasPrev()}
          onClick={props.prev}
        />
        <Button minimal small>
          {props.state.index + 1}
        </Button>
        <Button
          icon="arrow-right"
          minimal
          disabled={!props.hasNext()}
          onClick={props.next}
        />
        {/* <Button icon="chevron-left" minimal /> */}
        {/* <Button icon="chevron-right" minimal /> */}
        {/* <Button icon="double-chevron-right" minimal /> */}
      </ButtonGroup>
    </div>
  );
};

const useOpenState = (initialOpen = false) => {
  const [open, setOpen] = useState(initialOpen);
  return {
    open,
    setOpen,
  };
};

const Open: FC<ReturnType<typeof useOpenState> & { className?: string }> = (
  props
) => {
  return (
    <div>
      <Icon
        icon={props.open ? "caret-down" : "caret-right"}
        className={`rm-caret bp3-icon-standard hover-opacity ${props.className}`}
        onClick={() => props.setOpen(!props.open)}
        size={14}
      ></Icon>
      {props.children}
    </div>
  );
};

const GroupAlias = (props: { group: string; data: PullBlock[] }) => {
  const tableState = useTablePagination({ max: props.data.length, size: 10 });
  const children = props.data
    .slice(tableState.pagination.start, tableState.pagination.end)
    .map((bp) => {
      if (bp[":node/title"]) {
        return (
          <div key={bp[":block/uid"]}>
            <a
              onClick={(e) => openPage(e, bp[":block/uid"])}
              className="unlink-page rm-page__title no-select"
            >
              {bp[":node/title"]}
            </a>
          </div>
        );
      }
      return (
        <div className="rm-reference-item" key={bp[":block/uid"]}>
          <BreadcrumbsBlock uid={bp[":block/uid"]} showPage />
        </div>
      );
    });
  const openState = useOpenState(true);

  return (
    <div className="group group-alias">
      <Open {...openState} className="visible">
        <strong>{props.group}</strong>
      </Open>
      {openState.open ? (
        <div style={{ padding: "5px 0" }}>
          {children}
          <TablePagination {...tableState} />
        </div>
      ) : null}
    </div>
  );
};

const openPage = (e: React.MouseEvent<HTMLAnchorElement>, uid: string) => {
  if (e.shiftKey) {
    roam.open.sidebar(uid);
  } else {
    roam.open.mainWindow(uid);
  }
};

const GroupPageAlias = (props: { id: string; data: PullBlock[] }) => {
  const openState = useOpenState(true);
  const page = roam.blockFromId(props.id);
  const data = props.data.filter((bp) => !bp[":node/title"]);
  console.log(props, " === props", data);
  const tableState = useTablePagination({ max: data.length, size: 10 });
  const content = data
    .slice(tableState.pagination.start, tableState.pagination.end)
    .map((bp) => {
      return (
        <div className="rm-reference-item" key={bp[":block/uid"]}>
          <BreadcrumbsBlock uid={bp[":block/uid"]} showPage />
        </div>
      );
    });
  return (
    <div className="group group-pages">
      <Open {...openState}>
        <strong>
          <a
            className="rm-page__title no-select"
            onClick={(e) => openPage(e, page[":block/uid"])}
          >
            {page[":node/title"]}
          </a>
        </strong>
      </Open>
      {!openState.open ? null : (
        <>
          {content}
          {props.data.length > 20 ? (
            <TablePagination {...tableState}></TablePagination>
          ) : null}
        </>
      )}
    </div>
  );
};

const GroupPages = (props: {
  data: Record<string, AliasesBlock[]>;
  aliases: string[];
  pageUid: string;
}) => {
  const tableState = useTablePagination({
    max: Object.keys(props.data).length,
    size: 10,
  });
  const config = readConfigFromUid(props.pageUid);
  const resetChecked = () => {
    return props.aliases.reduce((p, c) => {
      p[c] = true;
      return p;
    }, {} as Record<string, boolean>);
  };
  const initChecked = () => {
    return props.aliases.reduce((p, c) => {
      p[c] = config.checked[c] ?? true;
      return p;
    }, {} as Record<string, boolean>);
  };
  const [checked, setChecked] = useState(() => initChecked());
  const checkdHasData = useMemo(() => {
    const set = new Set<string>();
    keys(props.data).forEach((id) => {
      props.data[id].forEach((bp) => {
        [...bp.aliases].forEach((alias) => {
          set.add(alias);
        });
      });
    });
    return [...set];
  }, [props.data]);
  const data = keys(props.data)
    .slice(tableState.pagination.start, tableState.pagination.end)
    .map((id) => {
      const pageData = props.data[id].filter((bp) => {
        console.log(bp.aliases, checked, " - filter");
        return [...bp.aliases].some((bpAlias) => {
          const result = keys(checked)
            .filter((k) => checked[k])
            .includes(bpAlias);
          return result;
        });
      });
      if (pageData.length === 0) {
        return null;
      }
      return <GroupPageAlias id={id} data={pageData} />;
    });
  return (
    <div className="">
      <div
        className="flex-row"
        style={{ margin: "4px 8px", justifyContent: "space-between" }}
      >
        <div>
          {props.aliases.map((alias) => {
            return (
              <Checkbox
                inline
                disabled={!checkdHasData.includes(alias)}
                checked={checked[alias]}
                onChange={() => {
                  const nextChecked = {
                    ...checked,
                    [alias]: !checked[alias],
                  };
                  setChecked(nextChecked);
                  saveConfigByUid(props.pageUid, {
                    checked: nextChecked,
                  });
                }}
                alignIndicator="right"
                label={alias}
              />
            );
          })}
        </div>
        <div>
          <Button
            icon="reset"
            small
            minimal
            onClick={() => {
              setChecked(resetChecked());
              saveConfigByUid(props.pageUid, {
                checked: resetChecked(),
              });
            }}
          />
        </div>
      </div>
      {data}
      <TablePagination {...tableState} />
    </div>
  );
};

const UnlinkAliasesContent: FC = (props) => {
  return <>{props.children}</>;
};

const UnlinkAliases = ({ pageUid }: { pageUid: string }) => {
  const config = readConfigFromUid(pageUid);
  const openState = useOpenState(config.open === "1");
  const [isGroupAliasMode, setIsGroupAliasMode] = useState(
    config.mode === "alias"
  );
  useEffect(() => {
    saveConfigByUid(pageUid, { mode: isGroupAliasMode ? "alias" : "page" });
  }, [isGroupAliasMode]);
  const [updateKey, setUpdateKey] = useState(0);
  const aliaseAndBlockUid = useMemo(() => {
    const aliases = getAllAliasesFromPageUid(pageUid);
    return aliases;
  }, [pageUid, updateKey]);

  const exceptUids = [pageUid, ...aliaseAndBlockUid[1]];

  const allblocksAndPages = useMemo(() => {
    return roam.allBlockAndPagesExceptUids(exceptUids);
  }, [pageUid, updateKey]);

  const groupUnlinkReferences = () => {
    const groupData = getGroupAllUnlinkReferenceFromAliases(
      allblocksAndPages,
      aliaseAndBlockUid[0]
    );
    return keys(groupData).map((key) => {
      return <GroupAlias group={key} data={groupData[key]}></GroupAlias>;
    });
  };

  const groupByPageUnlinkReferences = () => {
    const groupPageIdData = getPageGroupAllUnlinnkReferenceFromAliases(
      allblocksAndPages,
      aliaseAndBlockUid[0]
    );

    return (
      <GroupPages
        pageUid={pageUid}
        data={groupPageIdData}
        aliases={aliaseAndBlockUid[0]}
      />
    );
  };

  const content = isGroupAliasMode
    ? groupUnlinkReferences()
    : groupByPageUnlinkReferences();
  return (
    <div className="rm-mentions refs-by-page-view">
      <div
        className="rm-ref-page-view"
        style={{ margin: "-4px -4px 0px -16px" }}
      >
        <div className="flex-h-box rm-title-arrow-wrapper">
          <Open
            {...openState}
            setOpen={(next) => {
              openState.setOpen(next);
              saveConfigByUid(pageUid, { open: next ? "1" : "0" });
              next && setUpdateKey((key) => key + 1);
            }}
          >
            <strong
              style={{
                color: "rgb(206, 217, 224)",
              }}
            >
              Unlinked Aliases References
            </strong>
          </Open>

          {openState.open ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
              }}
            >
              <Popover
                autoFocus={false}
                enforceFocus={false}
                content={
                  <Menu>
                    <MenuItem text="Group" icon="th-list">
                      <MenuItem
                        text="Group By Alias"
                        onClick={() => setIsGroupAliasMode(true)}
                      />
                      <MenuItem
                        text="Group By Page"
                        onClick={() => setIsGroupAliasMode(false)}
                      />
                    </MenuItem>
                    <MenuItem
                      text={"Refresh"}
                      icon="refresh"
                      onClick={() => {
                        setUpdateKey((prev) => prev + 1);
                      }}
                    />
                  </Menu>
                }
              >
                <Button
                  small
                  minimal
                  icon="cog"
                  // intent={
                  //   level.current !== level.max || sort.index !== 0
                  //     ? "danger"
                  //     : "none"
                  // }
                />
              </Popover>
            </div>
          ) : null}
        </div>
        {openState.open ? (
          <UnlinkAliasesContent>
            <div style={{ marginLeft: 10, marginTop: 10 }}>{content}</div>
          </UnlinkAliasesContent>
        ) : null}
      </div>
    </div>
  );
};

const init = async () => {
  const pageOrBlockUid =
    await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  unmount();
  if (!pageOrBlockUid) {
    return;
  }
  const block = roam.getPullBlockFromUid(pageOrBlockUid);
  if (!isPage(block)) {
    return;
  }
  // check if
  const el = mountEl();
  ReactDOM.render(<UnlinkAliases pageUid={pageOrBlockUid} />, el);
};

export const unlinkAliasesInit = () => {
  extension_helper.on_uninstall(onRouteChange(init));
  init();
};
