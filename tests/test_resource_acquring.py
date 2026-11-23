def test_conflict_rolls_back_partial_acquire(session, task_a, task_b):
    # task_a занимает только transactions
    # task_b хочет [transactions, market_data]
    keys_a = build_resource_keys(session, "credit", date(2026,11,20), ["transactions"])
    keys_b = build_resource_keys(session, "market", date(2026,11,21), ["transactions", "market_data"])

    assert try_acquire_resources(session, task_a.id, keys_a) is True
    assert try_acquire_resources(session, task_b.id, keys_b) is False

    # ГЛАВНОЕ: market_data НЕ должен остаться захваченным task_b,
    # хотя конфликт был на transactions
    locks = session.execute(
        select(ResourceLock).where(ResourceLock.task_id == task_b.id)
    ).scalars().all()
    assert locks == []                     # <-- вот это доказывает транзакционность

    # и сам transactions всё ещё за task_a
    assert session.get(ResourceLock, "source:transactions").task_id == task_a.id


def test_release_after_success(session, task):
    keys = build_resource_keys(session, "credit", date(2026,11,20), ["transactions"])
    assert try_acquire_resources(session, task.id, keys) is True
    assert session.execute(select(ResourceLock)).scalars().all() != []

    release_resources(session, task.id)
    assert session.execute(select(ResourceLock)).scalars().all() == []