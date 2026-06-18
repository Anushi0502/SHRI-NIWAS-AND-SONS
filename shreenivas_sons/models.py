from dataclasses import dataclass


@dataclass(slots=True)
class Company:
    id: int
    name: str
    address: str
    gst_number: str
    phone: str
    email: str
    fy_start: str
    fy_end: str

