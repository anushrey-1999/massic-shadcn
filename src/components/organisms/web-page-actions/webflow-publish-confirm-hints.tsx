"use client";

import * as React from "react";

export type WebflowPublishConfirmAction =
  | "webflow-draft"
  | "webflow-live"
  | "webflow-staging-preview"
  | "webflow-rollback-draft";

type WebflowPublishConfirmHintsProps = {
  action: WebflowPublishConfirmAction | null;
  collectionName?: string | null;
  stagingSiteHost?: string | null;
  selectedLiveDomains?: string[];
  isLiveItem?: boolean;
  isStagingRefresh?: boolean;
};

const hintBoxClassName =
  "rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-xs leading-relaxed text-blue-950";

export function WebflowPublishConfirmDescription({
  action,
  isLiveItem = false,
  isStagingRefresh = false,
}: Pick<WebflowPublishConfirmHintsProps, "action" | "isLiveItem" | "isStagingRefresh">) {
  if (action === "webflow-draft") {
    return isLiveItem
      ? "This will save your changes as a draft in Webflow. Your live page will not change yet."
      : "This will save your post as a Webflow CMS draft. It will not publish or update live domains.";
  }
  if (action === "webflow-staging-preview") {
    return isStagingRefresh
      ? "This will republish your latest changes to the staging site and open the page in a new tab."
      : "This will publish this post to your Webflow staging site and open it in a new tab.";
  }
  if (action === "webflow-live") {
    return isLiveItem
      ? "This will update the live post on the domains you selected."
      : "This will publish your post live on the domains you selected.";
  }
  if (action === "webflow-rollback-draft") {
    return isLiveItem
      ? "This will unpublish only this Webflow CMS item and move it back to draft."
      : "This will remove only this post from Webflow staging preview and move it back to draft.";
  }
  return null;
}

export function WebflowPublishConfirmHint({
  action,
  collectionName,
  stagingSiteHost,
  selectedLiveDomains = [],
  isLiveItem = false,
  isStagingRefresh = false,
}: WebflowPublishConfirmHintsProps) {
  if (!action) return null;

  const collection = collectionName || "your collection";
  const stagingHost = stagingSiteHost?.replace(/^https?:\/\//, "").replace(/\/+$/, "") || null;

  if (action === "webflow-draft") {
    if (isLiveItem) {
      return (
        <div className={hintBoxClassName}>
          <p>
            Your draft is updated in Webflow. Visitors still see the current live version until you use{" "}
            <span className="font-semibold text-blue-900">Publish Live</span>.
          </p>
          <p className="mt-2">
            Preview the draft in Webflow → <span className="font-semibold text-blue-900">CMS</span> → {collection}.
          </p>
        </div>
      );
    }

    return (
      <div className={hintBoxClassName}>
        <p>
          This saves the CMS item as a draft in Webflow. It does not publish to staging or any selected live domain.
        </p>
        <p className="mt-2">
          To preview the draft, open <span className="font-semibold text-blue-900">CMS</span> → {collection} in Webflow.
        </p>
      </div>
    );
  }

  if (action === "webflow-staging-preview") {
    return (
      <div className={hintBoxClassName}>
        <p>
          {isStagingRefresh ? "Republishes" : "Publishes"}{" "}
          <span className="font-semibold text-blue-900">only this post</span> to your staging site
          {stagingHost ? (
            <>
              {" "}
              (<span className="font-mono text-[11px]">{stagingHost}</span>)
            </>
          ) : null}
          , then opens it in a new tab. Your live domains are not updated.
        </p>
        <p className="mt-2 text-blue-900/90">
          In Webflow CMS the item may show as staged or published for preview—it is not the same as Publish Live from
          Massic.
        </p>
      </div>
    );
  }

  if (action === "webflow-live") {
    return (
      <div className={hintBoxClassName}>
        <p>
          The post will be published on the live domains selected here. Visitors will see this version on{" "}
          {selectedLiveDomains.length ? (
            <span className="font-semibold text-blue-900">{selectedLiveDomains.join(", ")}</span>
          ) : (
            <span className="font-semibold text-blue-900">no domains until you select at least one</span>
          )}
          .
        </p>
      </div>
    );
  }

  if (action === "webflow-rollback-draft") {
    return (
      <div className={hintBoxClassName}>
        <p>
          This affects <span className="font-semibold text-blue-900">only this CMS item</span>. It does not publish the
          site, delete the CMS item, overwrite fields, or change other Webflow pages.
        </p>
        <p className="mt-2 text-blue-900/90">
          The item stays editable in Webflow CMS as a draft.
        </p>
      </div>
    );
  }

  return null;
}
