#### Reporting server task progress

Many tools are capable of performing some background task processing or data streaming. From a UX point of view, it's good to report both the fact that the tool is performing some background work, but also report the progress being made for it. To realize that and to provide a simple proposal based on which the feature can be later improved, the following additions are proposed:

_Client Capabilities_:

The client sets the following capability if it is supporting notifying task progress.

```ts
/**
 * Window specific client capabilities.
 */
window?: {
  /**
   * Whether client supports handling progress notifications.
   */
  progress?: boolean;
}
```

##### Window Progress Notification
_Notification_:

The `window/progress` notification is sent from the server to the client to ask the client to indicate progress.

* method: 'window/progress'
* params: `ProgressParams` defined as follows:
```ts
export interface ProgressParams {
    /**
     * A unique identifier to associate multiple progress notifications with
     * the same progress.
     */
    id: string;

    /**
     * Mandatory title of the progress operation. Used to briefly inform about
     * the kind of operation being performed.
     * Examples: "Indexing" or "Linking dependencies".
     */
    title: string;

    /**
     * Optional, more detailed associated progress message. Contains
     * complementary information to the `title`.
     * Examples: "3/25 files", "project/src/module2", "node_modules/some_dep".
     * If unset, the previous progress message (if any) is still valid.
     */
    message?: string;

    /**
     * Optional progress percentage to display (value 100 is considered 100%).
     * If unset, the previous progress percentage (if any) is still valid.
     */
    percentage?: number;

    /**
     * Set to true on the final progress update.
     * No more progress notifications with the same ID should be sent.
     */
    done?: boolean;
}
```
