def register_late_bound_routes(target_app, source_app):
    route_prefixes = (
        "/api/businesses/<int:business_id>/debts",
        "/api/businesses/<int:business_id>/feedback",
        "/api/receipt/",
        "/api/public/r/",
    )
    exact_routes = {
        "/api/sales",
        "/api/webhooks/brevo",
    }
    existing_rules = {
        (
            rule.rule,
            tuple(sorted(method for method in rule.methods if method not in {"HEAD", "OPTIONS"})),
        )
        for rule in target_app.url_map.iter_rules()
    }

    for rule in source_app.url_map.iter_rules():
        methods = tuple(sorted(method for method in rule.methods if method not in {"HEAD", "OPTIONS"}))
        if not methods:
            continue
        if rule.rule not in exact_routes and not any(rule.rule.startswith(prefix) for prefix in route_prefixes):
            continue
        signature = (rule.rule, methods)
        if signature in existing_rules:
            continue
        if rule.endpoint in target_app.view_functions:
            continue
        target_app.add_url_rule(
            rule.rule,
            endpoint=rule.endpoint,
            view_func=source_app.view_functions[rule.endpoint],
            methods=list(methods),
        )
        existing_rules.add(signature)
