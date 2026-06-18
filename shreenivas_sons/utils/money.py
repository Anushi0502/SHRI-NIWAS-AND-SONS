from decimal import Decimal, ROUND_HALF_UP


def money_to_paise(value) -> int:
    amount = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int((amount * 100).to_integral_value(rounding=ROUND_HALF_UP))


def paise_to_money(value: int) -> Decimal:
    return (Decimal(value) / Decimal(100)).quantize(Decimal("0.01"))


def format_money(value: int) -> str:
    return f"{paise_to_money(value):,.2f}"

