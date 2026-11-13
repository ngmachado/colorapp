'use client';

import { useState } from 'react';

/** The delete button asks once before the form posts; nothing is sent until the second press. */
export function DeleteAccount() {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button
        type="button"
        className="btn border-[var(--danger)] text-[var(--danger)]"
        onClick={() => setAsking(true)}
        data-testid="delete-account"
      >
        Delete my account and all of its data
      </button>
    );
  return (
    <form
      action="/api/account/delete"
      method="post"
      className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--danger)] px-3 py-2 text-sm"
      data-testid="confirm-delete"
    >
      <span>Delete this account? Nothing can be brought back afterwards.</span>
      <button
        type="submit"
        className="btn h-8 border-[var(--danger)] text-[0.8125rem] text-[var(--danger)]"
      >
        Delete
      </button>
      <button type="button" className="btn h-8 text-[0.8125rem]" onClick={() => setAsking(false)}>
        Keep
      </button>
    </form>
  );
}
